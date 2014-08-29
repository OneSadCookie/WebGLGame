#!/bin/sh
./tilepacker.swift PlanetCutePNG tiles web/images/tilemetrics.json
sips -s format png tiles.tiff --out web/images/tiles.png
rm tiles.tiff
cp PlanetCutePNG/SpeechBubble.png web/images/speech-up-right.png
