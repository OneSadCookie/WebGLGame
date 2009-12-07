map = null
inventory = null

tilemetrics = null

TILE_WIDTH = 101
TILE_HEIGHT = 171
TILE_GROUND_HEIGHT = 82
TILE_FRONT_HEIGHT = 41

function tileAt(x, y, h)
{
    if (x < 0 || x >= map['width'] ||
        y < 0 || y >= map['height'])
    {
        return null
    }
    
    var plane = map['planes'][h]
    if (plane)
    {
        return plane[x + map['width'] * y]
    }
    else
    {
        return null
    }
}

function objectsAt(x, y, h)
{
    return map['objects'].select(function(o)
    {
        return o.x == x && o.y == y && o.h == h
    })
}

function rampTile(dx, dy)
{
    if (dx == 0)
    {
        if (dy == -1)
        {
            return "Ramp North"
        }
        else
        {
            return "Ramp South"
        }
    }
    else if (dx == -1)
    {
        return "Ramp East"
    }
    else
    {
        return "Ramp West"
    }
    
    console.log('Weird dx/dy combination in rampTile')
}

function passable(tile)
{
    return !tile || tile == 'Door Tall Open'
}

function removeFromWorld(o)
{
    map['objects'] = map['objects'].reject(function(o2)
    {
        return o2 == o
    })
}

ALYNA_SPEECH = "Hello, my name is something suitably fantasy-ish " +
    "to appease, without being so unlikely as to detract from " +
    "the sense of reality of the world.  Perhaps &#x201c;Alyna&#x201d;. " +
    "If I were a real NPC, I might have something witty or helpful to " +
    "say, but I'm not, so I don't."

