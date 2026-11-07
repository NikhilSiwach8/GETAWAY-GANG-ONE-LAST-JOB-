# Stake Engine upload files

GitHub blocks files over 100 MB in commits, so the large files are stored here in parts.
The `Stake upload release` workflow rejoins them and publishes the full files on the
**Releases** page (tag `stake-upload`).

To rejoin locally instead:

    cat parts/getaway_gang_frontend.zip.part* > getaway_gang_frontend.zip
    cat parts/books_base.jsonl.zst.part*      > books_base.jsonl.zst
    cp parts/index.json parts/lookUpTable_base_0.csv .
    sha256sum -c SHA256SUMS.txt

Upload to Stake Engine: frontend = contents of `getaway_gang_frontend.zip`;
math = `index.json`, `lookUpTable_base_0.csv`, `books_base.jsonl.zst`.
