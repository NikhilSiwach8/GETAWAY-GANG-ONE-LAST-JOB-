"""Real-ESRGAN x2plus without PyTorch: read the official weights (RealESRGAN_x2plus.pth, a torch zip pickle)
with a minimal unpickler into numpy, build the RRDBNet graph as ONNX, run it with onnxruntime in tiles.

RRDBNet (x2plus): pixel-unshuffle 2 -> conv_first(12->64) -> 23 RRDB (3 residual dense blocks of 5 convs,
growth 32, LeakyReLU 0.2, residual scale 0.2) -> conv_body + skip -> 2x (nearest upsample, conv, lrelu)
-> conv_hr, lrelu -> conv_last(64->3). Net effect: 2x super-resolution.

Usage: python esrgan_onnx.py WEIGHTS.pth in.png out.png
"""
import sys
import zipfile

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, helper, numpy_helper
from PIL import Image


# ---------------------------------------------------------------- weights
# The .pth is a torch zip whose data.pkl is a pickle. Pickles can run code when *loaded*, so this never calls
# pickle.load: pickletools only *disassembles* the opcodes, and a tiny interpreter below keeps a plain data
# stack (strings, numbers, tuples, dicts) and recognises tensor records by their GLOBAL names. No object from
# the file is ever imported or called.
import pickletools


class _G:  # a GLOBAL reference, kept as a name only
    def __init__(self, mod, name):
        self.name = f"{mod}.{name}"


class _R:  # result of calling a GLOBAL (REDUCE), kept as (name, args)
    def __init__(self, fn, args):
        self.fn, self.args = fn, args


def _parse_pickle(data):
    stack, marks, memo = [], [], {}
    for op, arg, _ in pickletools.genops(data):
        n = op.name
        if n in ("PROTO", "FRAME", "STOP"):
            continue
        if n == "MARK":
            marks.append(len(stack))
        elif n in ("EMPTY_DICT",):
            stack.append({})
        elif n in ("EMPTY_TUPLE",):
            stack.append(())
        elif n in ("EMPTY_LIST",):
            stack.append([])
        elif n in ("BINUNICODE", "SHORT_BINUNICODE", "UNICODE", "BINUNICODE8", "SHORT_BINSTRING", "BINSTRING"):
            stack.append(arg)
        elif n in ("BININT", "BININT1", "BININT2", "LONG1", "INT", "LONG"):
            stack.append(int(arg))
        elif n in ("BINFLOAT", "FLOAT"):
            stack.append(float(arg))
        elif n in ("NEWTRUE", "NEWFALSE", "NONE"):
            stack.append({"NEWTRUE": True, "NEWFALSE": False, "NONE": None}[n])
        elif n in ("GLOBAL", "STACK_GLOBAL"):
            if n == "GLOBAL":
                mod, name = arg.split(" ", 1)
            else:
                name = stack.pop()
                mod = stack.pop()
            stack.append(_G(mod, name))
        elif n == "TUPLE":
            k = marks.pop()
            t = tuple(stack[k:])
            del stack[k:]
            stack.append(t)
        elif n in ("TUPLE1", "TUPLE2", "TUPLE3"):
            c = int(n[-1])
            t = tuple(stack[-c:])
            del stack[-c:]
            stack.append(t)
        elif n in ("BINPUT", "LONG_BINPUT", "PUT", "MEMOIZE"):
            memo[len(memo) if n == "MEMOIZE" else arg] = stack[-1]
        elif n in ("BINGET", "LONG_BINGET", "GET"):
            stack.append(memo[arg])
        elif n == "BINPERSID":
            stack.append(("persid", stack.pop()))
        elif n == "REDUCE":
            args = stack.pop()
            fn = stack.pop()
            stack.append(_R(getattr(fn, "name", "?"), args))
        elif n == "BUILD":
            stack.pop()  # object state (e.g. OrderedDict metadata): not needed
        elif n == "SETITEM":
            v = stack.pop()
            k = stack.pop()
            d = stack[-1]
            if isinstance(d, dict):
                d[k] = v
        elif n == "SETITEMS":
            k = marks.pop()
            items = stack[k:]
            del stack[k:]
            d = stack[-1]
            target = d if isinstance(d, dict) else getattr(d, "items_", None)
            if isinstance(d, _R):  # OrderedDict() result: store items on it
                d.items_ = dict(getattr(d, "items_", {}))
                target = d.items_
            for i in range(0, len(items), 2):
                target[items[i]] = items[i + 1]
        elif n in ("APPENDS", "APPEND"):
            if n == "APPEND":
                v = stack.pop()
                stack[-1].append(v)
            else:
                k = marks.pop()
                vals = stack[k:]
                del stack[k:]
                stack[-1].extend(vals)
        else:
            raise ValueError(f"unsupported pickle opcode {n}")
    return stack[-1]


def load_pth(path):
    """state dict -> {name: float32 array}, read without unpickling (see above)."""
    z = zipfile.ZipFile(path)
    root = z.namelist()[0].split("/")[0]
    top = _parse_pickle(z.read(f"{root}/data.pkl"))

    def as_dict(o):
        return o if isinstance(o, dict) else getattr(o, "items_", {})

    sd = as_dict(top)
    for k in ("params_ema", "params"):
        if k in sd:
            sd = as_dict(sd[k])
            break
    out = {}
    for name, rec in sd.items():
        if not (isinstance(rec, _R) and rec.fn.endswith("_rebuild_tensor_v2")):
            continue
        (_, (tag, stype, key, _dev, _numel)), offset, size, stride = rec.args[:4]
        dt = np.float16 if stype.name.endswith("HalfStorage") else np.float32
        raw = np.frombuffer(z.read(f"{root}/data/{key}"), dtype=dt)
        arr = np.lib.stride_tricks.as_strided(raw[offset:], shape=size, strides=[st * raw.itemsize for st in stride])
        out[name] = np.ascontiguousarray(arr, dtype=np.float32)
    return out


# ---------------------------------------------------------------- graph
def build(sd, num_block=23):
    nodes, inits = [], []
    cnt = [0]

    def name(p):
        cnt[0] += 1
        return f"{p}_{cnt[0]}"

    def conv(x, key):
        w, b = key + ".weight", key + ".bias"
        if w not in [i.name for i in inits]:
            inits.append(numpy_helper.from_array(sd[w], w))
            inits.append(numpy_helper.from_array(sd[b], b))
        y = name("conv")
        nodes.append(helper.make_node("Conv", [x, w, b], [y], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
        return y

    def lrelu(x):
        y = name("lrelu")
        nodes.append(helper.make_node("LeakyRelu", [x], [y], alpha=0.2))
        return y

    def add(a, b):
        y = name("add")
        nodes.append(helper.make_node("Add", [a, b], [y]))
        return y

    def scale(x, s):
        c = name("const")
        inits.append(numpy_helper.from_array(np.array(s, dtype=np.float32), c))
        y = name("mul")
        nodes.append(helper.make_node("Mul", [x, c], [y]))
        return y

    def cat(xs):
        y = name("cat")
        nodes.append(helper.make_node("Concat", xs, [y], axis=1))
        return y

    def rdb(x, p):
        x1 = lrelu(conv(x, p + ".conv1"))
        x2 = lrelu(conv(cat([x, x1]), p + ".conv2"))
        x3 = lrelu(conv(cat([x, x1, x2]), p + ".conv3"))
        x4 = lrelu(conv(cat([x, x1, x2, x3]), p + ".conv4"))
        x5 = conv(cat([x, x1, x2, x3, x4]), p + ".conv5")
        return add(scale(x5, 0.2), x)

    def up(x):
        y = name("up")
        sc = name("scales")
        inits.append(numpy_helper.from_array(np.array([1, 1, 2, 2], dtype=np.float32), sc))
        nodes.append(helper.make_node("Resize", [x, "", sc], [y], mode="nearest"))
        return y

    # pixel unshuffle 2 (x2plus): (1,3,H,W) -> (1,12,H/2,W/2), torch channel order c*4 + i*2 + j
    shp1 = numpy_helper.from_array(np.array([1, 3, -1, 2, 0, 2], dtype=np.int64), "shp1")
    inits.append(shp1)
    nodes.append(helper.make_node("Shape", ["input"], ["in_shape"]))
    # reshape via computed dims: use SpaceToDepth then reorder channels to torch's pixel_unshuffle order
    nodes.append(helper.make_node("SpaceToDepth", ["input"], ["s2d"], blocksize=2))  # order (i*2+j)*3 + c
    perm = np.array([((i * 2 + j) * 3 + c) for c in range(3) for i in range(2) for j in range(2)], dtype=np.int64)
    inits.append(numpy_helper.from_array(perm, "perm"))
    nodes.append(helper.make_node("Gather", ["s2d", "perm"], ["feat_in"], axis=1))
    fea = conv("feat_in", "conv_first")
    x = fea
    for b in range(num_block):
        p = f"body.{b}"
        y = rdb(rdb(rdb(x, p + ".rdb1"), p + ".rdb2"), p + ".rdb3")
        x = add(scale(y, 0.2), x)
    x = add(conv(x, "conv_body"), fea)
    x = lrelu(conv(up(x), "conv_up1"))
    x = lrelu(conv(up(x), "conv_up2"))
    x = conv(lrelu(conv(x, "conv_hr")), "conv_last")
    nodes.append(helper.make_node("Identity", [x], ["output"]))
    g = helper.make_graph(
        nodes, "rrdbnet_x2",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, None, None])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, None, None])],
        inits,
    )
    m = helper.make_model(g, opset_imports=[helper.make_opsetid("", 13)], ir_version=8)
    return m


def session(weights):
    m = build(load_pth(weights))
    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    return ort.InferenceSession(m.SerializeToString(), so, providers=["CPUExecutionProvider"])


def upscale(sess, rgb, tile=256, pad=16):
    """rgb float32 HxWx3 in 0..1 (H, W even) -> 2H x 2W x 3. Tiled with overlap to bound memory."""
    H, W, _ = rgb.shape
    out = np.zeros((H * 2, W * 2, 3), np.float32)
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            y1, x1 = min(H, y0 + tile), min(W, x0 + tile)
            ya, xa = max(0, y0 - pad), max(0, x0 - pad)
            yb, xb = min(H, y1 + pad), min(W, x1 + pad)
            ya -= ya % 2
            xa -= xa % 2
            yb += (yb - ya) % 2
            xb += (xb - xa) % 2
            yb, xb = min(H, yb), min(W, xb)
            patch = rgb[ya:yb, xa:xb].transpose(2, 0, 1)[None]
            res = sess.run(["output"], {"input": np.ascontiguousarray(patch)})[0][0].transpose(1, 2, 0)
            out[y0 * 2:y1 * 2, x0 * 2:x1 * 2] = res[(y0 - ya) * 2:(y0 - ya) * 2 + (y1 - y0) * 2, (x0 - xa) * 2:(x0 - xa) * 2 + (x1 - x0) * 2]
    return np.clip(out, 0, 1)


def upscale_image(sess, im):
    """PIL RGB/RGBA -> 2x PIL image. Alpha (if any) is upscaled with Lanczos."""
    im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
    W, H = im.size
    if W % 2 or H % 2:
        im = im.crop((0, 0, W - W % 2, H - H % 2))
    rgb = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    out = Image.fromarray((upscale(sess, rgb) * 255 + 0.5).astype(np.uint8), "RGB")
    if im.mode == "RGBA":
        out.putalpha(im.getchannel("A").resize(out.size, Image.LANCZOS))
    return out


if __name__ == "__main__":
    s = session(sys.argv[1])
    upscale_image(s, Image.open(sys.argv[2])).save(sys.argv[3])
