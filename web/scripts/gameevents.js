GameEvent = Class.create({
    
})

TileChangeEvent = Class.create(GameEvent, {
    
    initialize: function(x, y, h, from, to)
    {
        this.x = x
        this.y = y
        this.h = h
        this.from = from
        this.to = to
    }
    
})

ObjectRemoveEvent = Class.create(GameEvent, {
    
    initialize: function(object)
    {
        this.object = object
    }
    
})

ObjectMoveEvent = Class.create(GameEvent, {
    
    initialize: function(object, old_x, old_y, old_h, new_x, new_y, new_h)
    {
        this.object = object
        this.old_x = old_x
        this.old_y = old_y
        this.old_h = old_h
        this.new_x = new_x
        this.new_y = new_y
        this.new_h = new_h
    }
    
})

ObjectFailedMoveEvent = Class.create(GameEvent, {
    
    initialize: function(object, x, y, h, block)
    {
        this.object = object
        this.x = x
        this.y = y
        this.h = h
        this.block = block
    }
    
})

InventoryAddEvent = Class.create(GameEvent, {
    
    initialize: function(type)
    {
        this.type = type
    }
    
})

InventoryRemoveEvent = Class.create(GameEvent, {
    
    initialize: function(type)
    {
        this.type = type
    }
    
})

SpeechEvent = Class.create(GameEvent, {
    
    initialize: function(object, text)
    {
        this.object = object
        this.text = text
    }
    
})

CancelSpeechEvent = Class.create(GameEvent, {
    
})
