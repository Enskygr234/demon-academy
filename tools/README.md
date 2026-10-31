# Asset pipeline tools (Python 3 + Pillow, NumPy, SciPy, OpenCV)

* `extract.py` – segments the supplied sprite sheets into per-character atlases (`www/assets/sprites/*.png|json`) and writes `www/assets/data/sprite_meta.json`. Edit the band rectangles / expected frame counts at the bottom to add new sheets.
* `crops.py`   – cuts single-pose enemies/bosses (GrabCut background removal), effects, portraits and UI art.
* `bggen.py`   – generates the original parallax backgrounds, tilesets and props for all five areas.
* `preview.py` – renders contact sheets of extracted animations for visual QA.

Source sheets are read from `/mnt/user-data/uploads/` – change `U` at the top of each script to point at your art folder.
