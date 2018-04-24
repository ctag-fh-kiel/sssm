

function SSSMDrumkit(midiController, Clock){
    this.impulseResponseList = [
        // Impulse responses - each one represents a unique linear effect.
        {"name":"No Effect", "url":"undefined", "dryMix":1, "wetMix":0},
        {"name":"Spreader", "url":"impulse-responses/noise-spreader1.wav",        "dryMix":1, "wetMix":1},
        {"name":"Spring Reverb", "url":"impulse-responses/feedback-spring.wav",     "dryMix":1, "wetMix":1},
        {"name":"Space Oddity", "url":"impulse-responses/filter-rhythm3.wav",       "dryMix":1, "wetMix":0.7},
        {"name":"Huge Reverse", "url":"impulse-responses/matrix6-backwards.wav",    "dryMix":0, "wetMix":0.7},
        {"name":"Telephone Filter", "url":"impulse-responses/filter-telephone.wav", "dryMix":0, "wetMix":1.2},
        {"name":"Lopass Filter", "url":"impulse-responses/filter-lopass160.wav",    "dryMix":0, "wetMix":0.5},
        {"name":"Hipass Filter", "url":"impulse-responses/filter-hipass5000.wav",   "dryMix":0, "wetMix":4.0},
        {"name":"Comb 1", "url":"impulse-responses/comb-saw1.wav",                  "dryMix":0, "wetMix":0.7},
        {"name":"Comb 2", "url":"impulse-responses/comb-saw2.wav",                  "dryMix":0, "wetMix":1.0},
        {"name":"Cosmic Ping", "url":"impulse-responses/cosmic-ping-long.wav",      "dryMix":0, "wetMix":0.9},
        {"name":"Kitchen", "url":"impulse-responses/house-impulses/kitchen-true-stereo.wav", "dryMix":1, "wetMix":1},
        {"name":"Living Room", "url":"impulse-responses/house-impulses/dining-living-true-stereo.wav", "dryMix":1, "wetMix":1},
        {"name":"Living-Bedroom", "url":"impulse-responses/house-impulses/living-bedroom-leveled.wav", "dryMix":1, "wetMix":1},
        {"name":"Dining-Far-Kitchen", "url":"impulse-responses/house-impulses/dining-far-kitchen.wav", "dryMix":1, "wetMix":1},
        {"name":"Medium Hall 1", "url":"impulse-responses/matrix-reverb2.wav",      "dryMix":1, "wetMix":1},
        {"name":"Medium Hall 2", "url":"impulse-responses/matrix-reverb3.wav",      "dryMix":1, "wetMix":1},
        {"name":"Peculiar", "url":"impulse-responses/peculiar-backwards.wav",       "dryMix":1, "wetMix":1},
        {"name":"Backslap", "url":"impulse-responses/backslap1.wav",                "dryMix":1, "wetMix":1},
        {"name":"Diffusor", "url":"impulse-responses/diffusor3.wav",                "dryMix":1, "wetMix":1},
        {"name":"Huge", "url":"impulse-responses/matrix-reverb6.wav",               "dryMix":1, "wetMix":0.7},
    ];

    this.kitList = [
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

    this.init(midiController, Clock);
}

SSSMDrumkit.prototype = (function(){
    var self = this;
    var context,convolver, compressor, masterGainNode, effectLevelNode, filterNode, oscArr;
    var _nextStep, _rhythmIndex, _songIndex;
    var startTime;
    var noteTime, kMaxSwing,volumes;
    var initReady;
    var _rpnCheck, _rpnMSB, _rpnLSB, _rpnSelect;
    var kits, effects, tracks, filter, controller;
    var midiBinding,updateFunctions;
    var tempo, maxTempo, minTempo;
    var midi;
    var _spp, _spqn;
    var _lastQN;

    this.init = function(midiController){
        midi = midiController;
        noteTime = 0.0;
        kMaxSwing = .08;
        volumes = [0,0.3,1];
        initReady = 0;
        kits = [];
        effects = [];
        tracks = ["tom1","tom2","tom3","hihat","snare","kick"];
        filters = ["lowpass","highpass","bandpass"];
        minTempo = 80;
        maxTempo = 140;
        _nextStep = 0;
        _lastQN = 0;


        /* The controller object is the main reference for input values */
        controller = {
            main : {
                "tempo": 1,
                "swing": 0.0,
                "gain" : 1.0,
                "kit" : 0,
                "play" : 0,
                "loopSteps" : 16
            },
            effect : {
                "gain" : 1.0,
                "dryMix" : 1.0,
                "wetMix" : 0.5,
                "index" : 0
            },
            filter : {
                "q" : 1.0,
                "type" : 1,
                "frequency" : 1.0
            }
        }

        /* The midiBinding object is a reference table to link midi settings to controller objects or custom functions */
        midiBinding ={
             "b" : {
                "10" : ["main", 'tempo'],
                "11" : ["main", 'swing'],
                "12" : ["main", 'gain'],
                "13" : ["main", 'kit'],
                "20" : ["effect",'gain'],
                "21" : ["effect",'dryMix'],
                "22" : ["effect",'wetMix'],
                "23" : ["effect",'index'],
                "30" : ["filter",'frequency'],
                "31" : ["filter",'q'],
                "32" : ["filter",'type'],
                "63" : {
                    "04" : {}, // Track Steps
                    "05" : {}  // Track Properties
                }
                
            }
           
        }

        /* Update functions are called whenever a referred controller value changes */
        updateFunctions = {
            "main" : {
                "play" : function(value){
                    if(value > 0.5){
                        self.play();
                    }else{
                        self.stop();
                    }
                }
            
            },
            "effect" : {
                "index" : function(){
                    var effectIndex = parseInt(controller.effect.index * effects.length);
                    if(effects[effectIndex].buffer != undefined){
                        var buffer = effects[effectIndex].buffer;
                    }
                    if(buffer == 0 || buffer == undefined) return false;
                    convolver.buffer = buffer;
                 }
            },
            "filter" : {
                "frequency" : function(){
                    filterNode.frequency.value = Math.pow(controller.filter.frequency,2) * context.sampleRate/2;
                    console.log(filterNode.frequency.value)
                },
                "type" : function(){
                    var filterIndex;
                    filterIndex = parseInt(controller.filter.type * filters.length)
                    filterNode.type = filters[filterIndex];
                }
            }
        }

        this.isReady = false;
        this.initAudio();
        this.initKits(this.kitList);
        this.initEffects(this.impulseResponseList);
        this.initTracks();
    }

    this.initReady = function(){
        initReady++;
        if (initReady == 4) {
            this.isReady = 1;
        }
    }

    this.initKits = function(kitList){
        for(var key in kitList){
            kits[key] = new Kit(context,kitList[key].name,tracks);
            kits[key].load();
        }
        this.initReady();
    }

    this.initEffects = function(impulseResponseList){
        for(var key in impulseResponseList){
            effects[key] = new ImpulseResponse(context,impulseResponseList[key].url);
            effects[key].load();
        }
        this.initReady();
    }


    this.initTracks = function(){
        var midi_key = 0;
        for(var key in tracks){
            var track = tracks[key];
            var rhythmSet = Array(controller.main.loopSteps);

            controller[track] = {
                "rhythm": rhythmSet,
                "pitch" : 1,
                "gain" : 1
            }

            var binding = midiBinding['b']['63'];
            for(var i=0; i < rhythmSet.length; i++){
                rhythmSet[i] = 0;
                var hex = midi.intToHex(16*midi_key+i);
                binding['04'][hex] = [track,"rhythm",i];
            }

            binding['05'][midi.intToHex(midi_key*16+0)] = [track,'pitch'];
            binding['05'][midi.intToHex(midi_key*16+1)] = [track,'gain'];

            midi_key++;
        }
        this.initReady();
    }

    this.initAudio = function(){

        if (window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext'))
            window.webkitAudioContext = AudioContext;

        context = new webkitAudioContext();

        var finalMixNode;

        if (context.createDynamicsCompressor) {
            // Create a dynamics compressor to sweeten the overall mix.
            compressor = context.createDynamicsCompressor();
            compressor.connect(context.destination);
            finalMixNode = compressor;
        } else {
            // No compressor available in this implementation.
            finalMixNode = context.destination;
        }

        // create master filter node
        filterNode = context.createBiquadFilter();
        filterNode.type = "lowpass";
        filterNode.frequency.value = 0.5 * context.sampleRate;
        filterNode.Q.value = 1;
        filterNode.connect(finalMixNode);

        // Create master volume.
        masterGainNode = context.createGain();
        masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
        masterGainNode.connect(filterNode);

        // Create effect volume.
        effectLevelNode = context.createGain();
        effectLevelNode.gain.value = 1.0; // effect level slider controls this
        effectLevelNode.connect(masterGainNode);

        // Create convolver for effect
        convolver = context.createConvolver();
        convolver.connect(effectLevelNode);
        
        oscArr = []
        this.initReady();
    }


    /* Whenever the song position pointer is moving a note is played for each active step in the rhythm bank */
    var lastTime = 0;
    this.tick = function(){        
        if(_spp != _nextStep){
            _nextStep = _spp;
            _rhythmIndex = _nextStep % 16;
            _spqn = context.currentTime - _lastQN;
            _lastQN = context.currentTime;

            // apply swing
            var swing = (_nextStep % 2) ? 1 : -1;
            noteTime =  context.currentTime + (kMaxSwing * controller.main.swing * swing) ;
           
            for(var key in tracks){
                var track = tracks[key];
                if(controller[track].rhythm[_rhythmIndex]){
                    var volumeIndex = controller[track].rhythm[_rhythmIndex];
                    var volume = controller[track].rhythm[_rhythmIndex];
                    var kit = kits[parseInt(controller.main.kit*kits.length)];
                    var pitch = controller[track].pitch + 0.5;
                    if(kit != undefined && kit.buffer != undefined){
                        this.playNote(kit.buffer[track], false, 0, 0, -2, 1, volume * volume * controller[track].gain, pitch, noteTime);
                    }
                }
            }
        }
    }
    


    this.playNote = function(buffer, pan, x, y, z, sendGain, mainGain, playbackRate, noteTime) {
        // Create the note
        var voice = context.createBufferSource();
        if(buffer == undefined){
            console.log("Buffer undefined");
            return;
        }
        voice.buffer = buffer;
        voice.playbackRate.value = playbackRate;

        // Optionally, connect to a panner
        var finalNode;
        if (pan) {
            var panner = context.createPanner();
            panner.setPosition(x, y, z);
            voice.connect(panner);
            finalNode = panner;
        } else {
            finalNode = voice;
        }

        // Connect to dry mix
        var dryGainNode = context.createGain();
        dryGainNode.gain.value = mainGain * controller.effect.dryMix;
        finalNode.connect(dryGainNode);
        dryGainNode.connect(masterGainNode);

        // Connect to wet mix
        var wetGainNode = context.createGain();
        wetGainNode.gain.value = controller.effect.wetMix;
        finalNode.connect(wetGainNode);
        wetGainNode.connect(convolver);

        voice.start(noteTime);
    }


    this.getData = function() {
        return {
            "id"    : "drumkit",
            "kitList" : kitList,
            "impulseResponseList" : this.impulseResponseList,
            "filters" : filters,
            "controller" : controller,
            "tracks" : tracks
        }
    }

    /* The midi handler is the entry point for midi messages */
    this.midiHandler = function(message){
        var hexMessage, status, target, hexValue, binding;        
        hexMessage = midi.bytesToHex(message);
        status = hexMessage[0].substr(0,1);
        target = hexMessage[1];
        hexValue = hexMessage[2];
        if( status == "f"){
            if(target== "2"){
                var value,msb,lsb;
                msb = midi.hexToInt(hexMessage[2]);
                lsb = midi.hexToInt(hexMessage[3]);
                value = msb * 127 + lsb;
                _spp = value;
            }
            if(target== "8"){
                this.tick();
            }
        }
        if( target == "63" ){
            _rpnCheck = 1;
            _rpnMSB = hexValue;
            return;
        }else
        if( target == "62" && _rpnCheck == 1){
            _rpnCheck = 2;
            _rpnLSB = hexValue;
            return;
        }else
        if( target == "06" && _rpnCheck == 2){
            _rpnCheck = 0;
            binding = getNested(midiBinding,[status,'63',_rpnMSB,_rpnLSB])
        }else{
            binding = getNested(midiBinding,[status,target]);
        }
        if(binding){
            var value;
            value = (hexValue != undefined) ? midi.hexToInt(hexValue) : 0;
            if(typeof binding === "function" ){
                binding(value);
                return;
            }else{
                var updateFunction = self.update(binding);
                updateFunction(value);
                binding = updateFunction;
            }
        }
    }

    /* Returns a function that checks update functions and changes the controller object */
    this.update = function(args){
        if(getNested(controller,args) != undefined){
            return function(value){
                changeNested(controller,args,value/127);
                var updateFunction = getNested(updateFunctions,args);
                if(updateFunction){
                    updateFunction(value);
                }
            }
        }else{
            return function(){}
        }
    }

    function getNested(obj,args) {
      for (var i = 0; i < args.length; i++) {
        if (!obj || !(args[i] in obj)) {
          return false;
        }
        obj = obj[args[i]];
      }
      return obj;
    }

    function changeNested(obj,args,value) {
      for (var i = 0; i < args.length-1; i++) {
        if (!obj || !(args[i] in obj)) {
          return false;
        }
        obj = obj[args[i]];
      }
      var last = args[args.length-1]
      return obj[last] = value;
    }

    Object.defineProperty(this,"controller",{get: function(){return controller}});
    Object.defineProperty(this,"bindings",{get: function(){return midiBinding}});
    Object.defineProperty(this,"updates",{get: function(){return updateFunctions}});
    Object.defineProperty(this,"tempo",{get: function(){return tempo}});

    return this;
}).call(new Object());
