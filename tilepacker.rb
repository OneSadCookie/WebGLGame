#!/usr/bin/ruby

require 'osx/cocoa'

include OSX

images = {}
Dir[ARGV[0] + "/*.png"].each do |path|
    path =~ /^(.*)\.png$/
    images[File.basename($1)] = {
        :path => path,
        :image => NSBitmapImageRep.alloc.initWithData(NSData.dataWithContentsOfFile(path))
    }
end

tile_width, tile_height = nil, nil
images.each do |k, v|
    if !tile_width then
        tile_width = v[:image].pixelsWide
        tile_height = v[:image].pixelsHigh
    else
        if tile_width != v[:image].pixelsWide ||
            tile_height != v[:image].pixelsHigh then
            puts "Image #{k} is wrong size (#{v[:image].pixelsWide} x #{v[:image].pixelsHigh}); discarding."
            images.delete(k)
            next
        end
    end
    v[:image].setSize(NSMakeSize(v[:image].pixelsWide, v[:image].pixelsHigh))
end

PAD = 2

s = Math.sqrt(images.size)
tiles_across = s.ceil
tiles_down = s.floor
total_tiles = tiles_across * tiles_down
pixel_width = tiles_across * (tile_width + PAD) + PAD
pixel_height = tiles_down * (tile_height + PAD) + PAD
while total_tiles < images.size || pixel_width < pixel_height do
    #puts "#{total_tiles}, #{images.size}, #{pixel_width}, #{pixel_height}"
    if total_tiles < images.size then
        tiles_across += 1
    elsif pixel_width < pixel_height then
        tiles_across += 1
        tiles_down -= 1
    end
    total_tiles = tiles_across * tiles_down
    pixel_width = tiles_across * (tile_width + PAD) + PAD
    pixel_height = tiles_down * (tile_height + PAD) + PAD
end
puts "using #{tiles_across}x#{tiles_down}; #{total_tiles} total (#{images.size} filled); #{pixel_width}px x #{pixel_height}px"

large_image_rep = NSBitmapImageRep.alloc.initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel(
    nil,
    pixel_width,
    pixel_height,
    8,
    4,
    true,
    false,
    NSDeviceRGBColorSpace,
    pixel_width * 4,
    32)
NSGraphicsContext.setCurrentContext(NSGraphicsContext.graphicsContextWithBitmapImageRep(large_image_rep))
x, y = 0, 0
f = File.open(ARGV[2], 'wb')
f.puts("{")
first = true
images.each do |k, v|
    x_px = x * (tile_width + PAD) + PAD
    y_px = y * (tile_height + PAD) + PAD
    v[:image].drawAtPoint(NSMakePoint(x_px, y_px))
    if first then
        first = false
    else
        f.puts(",\n")
    end
    f.print((<<EOR
    "#{k}": {
        "x": #{x_px},
        "y": #{y_px},
        "w": #{tile_width},
        "h": #{tile_height}
    }
EOR
).chomp)
    x += 1
    if x >= tiles_across then
        x = 0
        y += 1
    end
end
f.puts("\n}")
f.close
NSGraphicsContext.currentContext.flushGraphics
large_image_rep.TIFFRepresentation.writeToFile_atomically("#{ARGV[1]}.tiff", true)
