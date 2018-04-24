function Kit(context,name,tracks) {
    this.name = name;
    this.context = context;
    this.pathName = function() {
        var pathName = "sounds/drum-samples/" + this.name + "/";
        return pathName;
    };

    this.buffer = new Object();
    this.tracks = tracks;
    this.instrumentCount = tracks.length;
    this.instrumentLoadCount = 0;

    this.startedLoading = false;
    this.isLoaded = false;

    this.demoIndex = -1;
}

Kit.prototype.setDemoIndex = function(index) {
    this.demoIndex = index;
}

Kit.prototype.load = function() {
    if (this.startedLoading)
        return;

    this.startedLoading = true;

    var pathName = this.pathName();

    for(var key in this.tracks){
        var path = pathName + this.tracks[key] + ".wav";
        this.loadSample(key,path,false)
    }
}

Kit.prototype.loadSample = function(sampleID, url, mixToMono) {
    // Load asynchronously

    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var kit = this;

    request.onload = function() {
        kit.context.decodeAudioData(
            request.response,
            function(buffer) {
                var track = kit.tracks[sampleID];
                kit.buffer[track] = buffer;

                kit.instrumentLoadCount++;
                if (kit.instrumentLoadCount == kit.instrumentCount) {
                    kit.isLoaded = true;

                    if (kit.demoIndex != -1) {
                        beatDemo[kit.demoIndex].setKitLoaded();
                    }
                }
            },

            function(buffer) {
                console.log("Error decoding drum samples!");
            }
        );
    }

    request.send();
}

var kitList = [
    { "name" : "R8", "pretty" : "Roland R-8"  },
    { "name" : "CR78", "pretty" : "Roland CR-78" },
    { "name" : "KPR77", "pretty" : "Korg KPR-77" },
    { "name" : "LINN", "pretty" : "LinnDrum" },
    { "name" : "Kit3", "pretty" : "Kit 3" },
    { "name" : "Kit8", "pretty" : "Kit 8" },
    { "name" : "Techno","pretty" : "Stark" },
    { "name" : "Stark","pretty" : "Breakbeat 8" },
    { "name" : "breakbeat8", "pretty" : "Breakbeat 8" },
    { "name" : "breakbeat9", "pretty" : "Breakbeat 9" },
    { "name" : "breakbeat13", "pretty" : "Breakbeat 13" },
    { "name" : "acoustic-kit", "pretty" : "Acoustic Kit" },
    { "name" : "4OP-FM", "pretty" : "4OP-FM" },
    { "name" : "TheCheebacabra1", "pretty" : "The Cheebacabra 1" },
    { "name" : "TheCheebacabra2", "pretty" : "The Cheebacabra 2"}
];
