function ImpulseResponse(context,url) {
    this.url = url;
    this.context = context;
    this.startedLoading = false;
    this.isLoaded_ = false;
    this.buffer = 0;

}

ImpulseResponse.prototype.isLoaded = function() {
    return this.isLoaded_;
}

ImpulseResponse.prototype.load = function() {
    if (this.startedLoading) {
        return;
    }

    this.startedLoading = true;

    // Load asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", this.url, true);
    request.responseType = "arraybuffer";
    this.request = request;

    var asset = this;

    request.onload = function() {
        asset.context.decodeAudioData(
            request.response,
            function(buffer) {
                asset.buffer = buffer;
                asset.isLoaded_ = true;
            },

            function(buffer) {
                console.log("Error decoding impulse response!");
            }
        );
    }

    request.send();
}
