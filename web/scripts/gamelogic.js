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

function interactWithAdjacentObjects_allowsMove(os, events)
{
    // I don't like that this function has side effects as well as returning
    // boolean for passable/not, but...
    
    var canMove = true
    os.each(function(o)
    {
        if (o.tile == 'Key')
        {
            events.push(new ObjectRemoveEvent(o))
            events.push(new InventoryAddEvent('Key'))
            inventory.push('Key')
            removeFromWorld(o)
        }
        else if (o.tile == 'Character Horn Girl')
        {
            canMove = false
            events.push(new SpeechEvent(o, ALYNA_SPEECH))
        }
        else
        {
            console.error('Interaction with unknown object: ' + o.tile)
        }
    })
    
    return canMove
}

function executeMove(object, new_x, new_y, new_h, events)
{
    events.push(new ObjectMoveEvent(
        object,
        object.x,
        object.y,
        object.h,
        new_x,
        new_y,
        new_h))
    
    object.x = new_x
    object.y = new_y
    object.h = new_h
}

function doMove(object, dx, dy, events)
{
    var new_x = object.x + dx
    var new_y = object.y + dy
    
    if (new_x >= map['width']  || new_x < 0 ||
        new_y >= map['height'] || new_y < 0)
    {
        return
    }
    
    var current_tile = tileAt(object.x, object.y, object.h - 1)
    var next_tile_wall = tileAt(new_x, new_y, object.h)
    var next_tile_ground = tileAt(new_x, new_y, object.h - 1)
    if (passable(next_tile_wall) && next_tile_ground)
    {
        var os = objectsAt(new_x, new_y, object.h)
        if (interactWithAdjacentObjects_allowsMove(os, events))
        {
            executeMove(object, new_x, new_y, object.h, events)
        }
    }
    else if (next_tile_wall == 'Door Tall Closed')
    {
        if (inventory.indexOf('Key') >= 0)
        {
            events.push(new TileChangeEvent(
                new_x,
                new_y,
                object.h,
                'Door Tall Closed',
                'Door Tall Open'))
            events.push(new InventoryRemoveEvent('Key'))
            
            map['planes'][object.h][new_x + map['width'] * new_y] = 'Door Tall Open'
            inventory.splice(inventory.indexOf('Key'), 1)
            
            executeMove(object, new_x, new_y, object.h, events)
        }
        else
        {
            events.push(new ObjectFailedMoveEvent(
                object,
                object.x,
                object.y,
                object.h,
                'Door Tall Closed'))
        }
    }
    else if (next_tile_wall == rampTile(dx, dy))
    {
        var os = objectsAt(new_x, new_y, object.h + 1)
        if (interactWithAdjacentObjects_allowsMove(os, events))
        {
            executeMove(object, new_x, new_y, object.h + 1, events)
        }
    }
    else if (current_tile == rampTile(-dx, -dy))
    {
        var next_tile_ground2 = tileAt(new_x, new_y, object.h - 2)
        if (!next_tile_ground && next_tile_ground2)
        {
            var os = objectsAt(new_x, new_y, object.h - 1)
            if (interactWithAdjacentObjects_allowsMove(os, events))
            {
                executeMove(object, new_x, new_y, object.h - 1, events)
            }
        }
    }
}
