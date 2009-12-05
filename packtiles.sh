#!/bin/sh
./tilepacker.rb PlanetCutePNG tiles web/images/tilemetrics.json
sips -s format png tiles.tiff --out web/images/tiles.png
rm tiles.tiff
