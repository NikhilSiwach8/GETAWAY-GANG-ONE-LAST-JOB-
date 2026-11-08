# Stake Engine upload files

GitHub blocks files over 100 MB in commits, so the large files are stored here in parts.
The `Stake upload release` workflow rejoins them and publishes the full files on the
**Releases** page (tag `stake-upload`).

To rejoin locally instead:

    cat parts/getaway_gang_frontend.zip.part* > getaway_gang_frontend.zip
    for m in base heist escape mystery; do cat parts/books_$m.jsonl.zst.part* > books_$m.jsonl.zst; done
    cp parts/index.json parts/lookUpTable_*_0.csv .
    sha256sum -c SHA256SUMS.txt

Upload to Stake Engine: frontend = contents of `getaway_gang_frontend.zip`;
math = `index.json` plus `lookUpTable_<mode>_0.csv` and `books_<mode>.jsonl.zst` for the modes
`base` (1×), `heist` (43× bonus buy), `escape` (450× bonus buy) and `mystery` (420× Mystery Vault buy).
