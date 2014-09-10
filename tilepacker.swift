#!/usr/bin/xcrun swift

import Cocoa

extension NSDirectoryEnumerator : SequenceType, GeneratorType
{
    public typealias GeneratorType = NSDirectoryEnumerator
    public func generate() -> GeneratorType { return self }
    
    public typealias Element = NSString
    public func next() -> Element? { return nextObject() as? Element }
}

extension NSOutputStream : OutputStreamType
{
    public func write(string: String)
    {
        string.withCString()
        { [weak self] (s: UnsafePointer<Int8>) -> () in
            let bytes = UnsafePointer<UInt8>(s)
            let len = Int(strlen(s))
            self!.write(bytes, maxLength: len)
        }
    }
}

struct TileFile
{
    let path: String
    let image: NSBitmapImageRep
}

var err:NSError?
let dir = String.fromCString(C_ARGV[1])!
let out_tiff = String.fromCString(C_ARGV[2])!
let out_json = String.fromCString(C_ARGV[3])!
let fm = NSFileManager.defaultManager()
let png_re = NSRegularExpression(pattern: "^(.*)\\.png$", options: nil, error: &err)
var images:Dictionary<String, TileFile> = [:]
for filename in fm.enumeratorAtPath(dir)!
{
    let string_range = NSRange(location: 0, length: filename.length)
    let match:NSTextCheckingResult? = png_re.firstMatchInString(filename, options: nil, range: string_range)
    if let m = match
    {
        let path = dir.stringByAppendingPathComponent(filename)
        images[filename.substringWithRange(m.rangeAtIndex(1))] = TileFile(path: path, image: NSBitmapImageRep(data: NSData(contentsOfFile: path)))
    }
}

var tile_size: (Int, Int)?
for (k, v) in images
{
    if let (w, h) = tile_size
    {
        if w != v.image.pixelsWide || h != v.image.pixelsHigh
        {
            println("Image \(k) is wrong size(\(v.image.pixelsWide) × \(v.image.pixelsHigh)); discarding.")
            images.removeValueForKey(k)
        }
    }
    else
    {
        tile_size = (v.image.pixelsWide, v.image.pixelsHigh)
    }
    // discard DPI
    v.image.size = NSSize(width: v.image.pixelsWide, height: v.image.pixelsHigh)
}
assert(tile_size != nil)

let PAD = 2

let s = sqrt(Double(images.count))
let (tile_width, tile_height) = tile_size!
var tiles_across = Int(ceil(s))
var tiles_down = Int(floor(s))
var total_tiles = tiles_across * tiles_down
var pixel_width = tiles_across * (tile_width + PAD) + PAD
var pixel_height = tiles_down * (tile_height + PAD) + PAD
while total_tiles < images.count || pixel_width < pixel_height
{
    if total_tiles < images.count
    {
        tiles_across += 1
    }
    else if pixel_width < pixel_height
    {
        tiles_across += 1
        tiles_down -= 1
    }
    total_tiles = tiles_across * tiles_down
    pixel_width = tiles_across * (tile_width + PAD) + PAD
    pixel_height = tiles_down * (tile_height + PAD) + PAD
}
println("Using \(tiles_across) × \(tiles_down); \(total_tiles) total (\(images.count) filled); \(pixel_width)px × \(pixel_height)px")

let large_image_rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixel_width, pixelsHigh: pixel_height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: NSDeviceRGBColorSpace, bytesPerRow: pixel_width * 4, bitsPerPixel: 32)
NSGraphicsContext.setCurrentContext(NSGraphicsContext(bitmapImageRep: large_image_rep))
var x = 0, y = 0
var json:NSMutableDictionary = [:]
for (k, v) in images
{
    let x_px = x * (tile_width + PAD) + PAD
    let y_px = y * (tile_height + PAD) + PAD
    v.image.drawAtPoint(NSPoint(x: x_px, y: y_px))
    x += 1
    if x >= tiles_across
    {
        x = 0
        y += 1
    }
    json[k] = [
    	"x": x_px,
    	"y": y_px,
    	"w": tile_width,
    	"h": tile_height,
    ]
}
let json_data = NSJSONSerialization.dataWithJSONObject(json, options: .PrettyPrinted, error: &err)!
json_data.writeToFile(out_json, atomically: true)
NSGraphicsContext.currentContext().flushGraphics()
large_image_rep.TIFFRepresentation.writeToFile(out_tiff + ".tiff", atomically: true)
