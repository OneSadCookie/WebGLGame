ResourceManager = Class.create({
    initialize: function(resourceCount, onProgress, onSuccess, onFailure)
    {
        this.resourceCount = resourceCount
        this.resourcesLoaded = 0
        this.errors = 0
        this.onProgress = onProgress
        this.onSuccess = onSuccess
        this.onFailure = onFailure
        this.failureCalled = false
    },
    
    loaded: function(name)
    {
        this.resourcesLoaded += 1
        if (this.resourcesLoaded <= this.resourceCount)
        {
            this.onProgress(name, this.percentComplete())
        }
        
        if (this.resourcesLoaded == this.resourceCount)
        {
            this.onSuccess(name)
        }
        else if (this.resourcesLoaded > this.resourceCount)
        {
            console.warn(
                "Loaded " + this.resourcesLoaded +
                " resources; expecting " + this.resourceCount +
                ".")
        }
    },
    
    error: function(name)
    {
        console.error("Loading " + name + " failed.")
        if (!this.failureCalled)
        {
            this.failureCalled = true
            this.onFailure(name)
        }
    },
    
    percentComplete: function()
    {
        return 100 * this.resourcesLoaded / this.resourceCount
    }
})
