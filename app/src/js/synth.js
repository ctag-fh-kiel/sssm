function SSSMSynth(){

    var self = this;
    var midi;
    var context, masterGainNode, convolver, effectLevelNode;
    var modOsc, modOscMax, modOsc1Gain, modOsc2Gain;
    var ampAtk, ampDec, ampSus, ampRel;
    var envMaxAtk, envMaxDec, envSus, envMaxRel;
    var envBuffer;
    var notes;
    var controller;
    var waveforms, filterTypes, multiplier, filters;
    var midiBinding,updateFunctions,values;
    var _currentStep;
    var filterRange;

    this.init = function(midiController){
        this.isReady = 0;
        midi = midiController;
        modOscMax = 40;
        envMaxAtk = 6;
        envMaxDec = 6;
        envMaxRel = 6;
        filterRange = 7200;
        _currentStep = 0;
        notes = []

    
        /* The controller object is the main reference for input values */
        controller = {
            "osc1" : {
                "type" : 0,
                "gain" : 1,
                "detune" : 0.5,
                "envelope" : 0
            },
            "osc2" : {
                "type" : 0,
                "gain" : 1,
                "detune" : 0.5,
                "envelope" : 0
            },
            "oscAmp" : {
                "attack" : 0,
                "decay" :   0,
                "sustain" : 1,
                "release" : 0
            },
            "env1":{
                "attack" : 0,
                "decay" :   0,
                "sustain" : 1,
                "release" : 0.1
            },
            "env2":{
                "attack" : 0,
                "decay" :   0,
                "sustain" : 1,
                "release" : 0.1
            },
            "modOsc" : {
                "frequency" : 1,
                "type" : 0,
                "multiplier" : 0,
                "gain"  : 1
            },
            "lfo1" : {
                "frequency" : 0.5,
                "type" : 1
            },
            "filter" : {
                "gain" : 1,
                "frequency" : 0.5,
                "q" : 0,
                "type" : 0,
                "detune" : 0
            }

        }

        /* The midiBinding object is a reference table to link midi settings to controller objects or custom functions */
        midiBinding = {
            "b" : {
                "01" : ["env2","attack"],
                "02" : ["env2","decay"],
                "03" : ["env2","sustain"],
                "04" : ["env2","release"],
                "05" : ["env1","attack"],
                "06" : ["env1","decay"],
                "07" : ["env1","sustain"],
                "08" : ["env1","release"],
                "10" : ["osc1","type"],
                "11" : ["osc1","gain"],
                "12" : ["osc1","detune"],
                "20" : ["osc2","type"],
                "21" : ["osc2","gain"],
                "22" : ["osc2","detune"],
                "30" : ["modOsc","type"],
                "31" : ["modOsc","frequency"],
                "32" : ["modOsc","multiplier"],
                "33" : ["modOsc","gain"],
                "40" : ["oscAmp","attack"],
                "41" : ["oscAmp","decay"],
                "42" : ["oscAmp","sustain"],
                "43" : ["oscAmp","release"],
                "44" : ["filter","frequency"],
                "45" : ["filter","type"],
                "46" : ["filter","q"],
                "50" : ["env1","attack"],
                "51" : ["env1","decay"],
                "52" : ["env1","sustain"],
                "53" : ["env1","release"],
                "54" : ["env2","attack"],
                "55" : ["env2","decay"],
                "56" : ["env2","sustain"],
                "57" : ["env2","release"],
                "60" : ["lfo1", "frequency"],
                "61" : ["lfo1", "target"],
                "7b" : this.silenceAll.bind(this)
            },
            "f" : {
                "2" : function(){_currentStep = 0},
                "8" : this.step
            }
        }
        
        /* The values object holds conversion functions */
        values = {
            "osc1":{
                "type" : function () {
                    return waveforms[parseInt(controller.osc1.type*waveforms.length)];
                },
                "detune" : function(){
                    return (controller.osc1.detune-0.5) * 7200
                },
                "gain" : function () {
                    return controller.osc1.gain*0.5;
                }
            },
            "osc2":{
                "type" : function () {
                    return waveforms[parseInt(controller.osc2.type*waveforms.length)];
                },
                "detune" : function(){
                    return (controller.osc2.detune-0.5) * 7200
                },
                "gain" : function () {
                    return controller.osc2.gain*0.5;
                }
            },
            "filter":{
                "type" : function () {
                    return filterTypes[parseInt(controller.filter.type*filterTypes.length)];
                },
                "frequency" : function(){
                    return Math.pow(controller.filter.frequency,2) * filterRange+1;
                },
                "q": function(){
                    return 10 * Math.pow(controller.filter.q,2);
                }
            },
            "modOsc":{
                "type" : function(){
                    return waveforms[parseInt(controller.modOsc.type*waveforms.length)]
                },
                "frequency" : function(){
                    return modOscMax * Math.pow(controller.modOsc.frequency,4);
                },
                "gain" : function () {
                    var multi = multiplier[parseInt(controller.modOsc.multiplier * multiplier.length)];
                    return controller.modOsc.gain * multi;
                }
            }
        }



        /* Update functions are called whenever a referred controller value changes */
        updateFunctions = {
            "filter" : {
                "frequency" : function(){
                    notes.forEach(function(note){
                        if (note != undefined)
                        note.filters.forEach(function(filter){ 
                            filter.frequency.cancelScheduledValues(context.currentTime);
                            filter.frequency.linearRampToValueAtTime(values.filter.frequency(),context.currentTime + 0.05) });
                    });
                },
                "q" : function(){
                    notes.forEach(function(note){
                        if (note != undefined)
                        note.filters.forEach(function(filter){ 
                            filter.Q.cancelScheduledValues(context.currentTime);
                            filter.Q.linearRampToValueAtTime(values.filter.q(),context.currentTime + 0.05) });
                    });
                }
            },
            "modOsc" : {
                "type" : function(){
                    modOsc.type = values.modOsc.type();
                },
                "frequency" : function(){
                    modOsc.frequency.cancelScheduledValues(context.currentTime);
                    modOsc.frequency.linearRampToValueAtTime(values.modOsc.frequency(),context.currentTime + 0.05);
                },
                "multiplier" : function () {
                    modOsc1Gain.gain.cancelScheduledValues(context.currentTime);
                    modOsc1Gain.gain.linearRampToValueAtTime(values.modOsc.gain(),context.currentTime + 0.05);
                    modOsc2Gain.gain.cancelScheduledValues(context.currentTime);
                    modOsc2Gain.gain.linearRampToValueAtTime(values.modOsc.gain(),context.currentTime + 0.05);
                },
                "gain" : function(){
                    modOsc1Gain.gain.cancelScheduledValues(context.currentTime);
                    modOsc1Gain.gain.linearRampToValueAtTime(values.modOsc.gain(),context.currentTime + 0.05);
                    modOsc2Gain.gain.cancelScheduledValues(context.currentTime);                    
                    modOsc2Gain.gain.linearRampToValueAtTime(values.modOsc.gain(),context.currentTime + 0.05);
                }
            },
            "osc1" : {
                "detune" : function(){
                    notes.forEach(function(note){
                        if (note != undefined)
                        note.osc1.detune.cancelScheduledValues(context.currentTime);
                        note.osc1.detune.linearRampToValueAtTime(values.osc1.detune(),context.currentTime + 0.05);
                    })
                },
                "gain" : function(){
                    notes.forEach(function(note){
                        if (note != undefined)
                        note.osc1Gain.gain.cancelScheduledValues(context.currentTime);
                        note.osc1Gain.gain.linearRampToValueAtTime(values.osc1.gain(), context.currentTime  + 0.05);
                    })
                }
            },
            "osc2" : {
                "detune" : function(value){
                    notes.forEach(function(note){
                        if (note != undefined)
                        note.osc2.detune.cancelScheduledValues(context.currentTime);
                        note.osc2.detune.linearRampToValueAtTime(values.osc2.detune(),context.currentTime + 0.05);
                    })
                },
                "gain" : function () {
                        notes.forEach(function(note){
                            if (note != undefined)
                            note.osc2Gain.gain.cancelScheduledValues(context.currentTime);
                            note.osc2Gain.gain.linearRampToValueAtTime(values.osc2.gain(),context.currentTime + 0.05);
                        })
                }
            }, 
            "env1":{
                "release" : function(value){
                    controller.env1.release = Math.max(0, Math.pow(value/127,2));
                },
                "sustain" : function(value){
                    controller.env1.sustain = Math.max(0, Math.pow(value/127,2));
                },
                "attack" : function(value){
                    controller.env1.attack = Math.max(0, Math.pow(value/127,2));
                },
                "decay" : function(value){
                    controller.env1.decay = Math.max(0, Math.pow(value/127,2));
                }
            },
            "env2":{
                "release" : function(value){
                    controller.env2.release = Math.max(0, Math.pow(value/127,2));
                },
                "sustain" : function(value){
                    controller.env2.sustain = Math.max(0, Math.pow(value/127,2));
                },
                "attack" : function(value){
                    controller.env2.attack = Math.max(0, Math.pow(value/127,2));
                },
                "decay" : function(value){
                    controller.env2.decay = Math.max(0, Math.pow(value/127,2));
                }
            },
           
        }
        this.initAudio();
    }



    this.initAudio = function(){
        if ( window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext')){
            window.webkitAudioContext = AudioContext;
        }
        context = new webkitAudioContext();
        waveforms = ["sine","square","sawtooth","triangle"];
        filterTypes = ["lowpass","highpass","bandpass","lowshelf","highshelf"];
        multiplier = [1,2,4,8];

        var finalMixNode;
        if (context.createDynamicsCompressor ) {
            // Create a dynamics compressor to sweeten the overall mix.
            compressor = context.createDynamicsCompressor();
            compressor.connect( context.destination );
            finalMixNode = compressor;
        } else {
            // No compressor available in this implementation.
            finalMixNode = context.destination;
        }

        // Create master volume.
        masterGainNode = context.createGain();
        masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
        //masterGainNode.connect(finalMixNode); 

        // create modulator osc
        modOsc = context.createOscillator();
        modOsc.type = values.modOsc.type();
        modOsc.frequency.value = values.modOsc.frequency();

        modOsc1Gain = context.createGain();
        modOsc1Gain.gain.value = controller.modOsc.gain;

        modOsc2Gain = context.createGain();
        modOsc2Gain.gain.value = controller.modOsc.gain;
        
        filters = [];
        for(var i=0; i<4; i++){
            // create master filter node
            filters[i] = context.createBiquadFilter();
           
        }
        filters.forEach(function(val,key){
            if(key == 0){ 
                masterGainNode.connect(val);
            }
            if(key < filters.length-1){
                val.connect(filters[key+1]); return;
                return;    
            }
            val.connect(finalMixNode);
        })

        modOsc.start(0);

        notes = []

        this.isReady = 1;
    }


    this.voice = function( note, velocity ) {
        var osc1, osc2, osc1Gain, osc2Gain, oscAmp, filter, env1, env2;
        self.muteNote(note);
        // create oscillator
        osc1 = context.createOscillator();
        osc1.frequency.value = self.frequencyFromNoteNumber( note );
        osc1.type = values.osc1.type();
        osc1.detune.value = values.osc1.detune();
        osc1Gain = context.createGain();
        osc1Gain.gain.value = (0.33 * velocity) * controller.osc1.gain;
        
        osc2 = context.createOscillator();
        osc2.frequency.value = self.frequencyFromNoteNumber( note );
        osc2.type = values.osc2.type();
        osc2.detune.value = values.osc2.detune();
        osc2Gain = context.createGain();
        osc2Gain.gain.value = (0.33 * velocity) * controller.osc2.gain;
        
        oscAmp = context.createGain();

        var now;
        filters.forEach(function(filter){
            var targetFreq
            //filter.frequency.value = values.filter.frequency();       
            now = context.currentTime;
            filter.type = values.filter.type();
            filter.Q.value = values.filter.q();            
            targetFreq = values.filter.frequency();
            filter.frequency.cancelScheduledValues(now);            
            filter.frequency.setValueAtTime(filterRange,now);
            now += envMaxAtk * controller.env1.attack;
            filter.frequency.linearRampToValueAtTime(targetFreq,now);
            now += envMaxDec * controller.env1.decay;
            var sustainFreq = targetFreq+ (filterRange - targetFreq)*(1-controller.env1.sustain);
            filter.frequency.linearRampToValueAtTime(sustainFreq, now); 
        })

        now = context.currentTime;
        oscAmp.gain.setValueAtTime(0,now);
        now += envMaxAtk * controller.env2.attack;
        oscAmp.gain.linearRampToValueAtTime(1,now);
        now += envMaxDec * controller.env2.decay;
        oscAmp.gain.linearRampToValueAtTime(controller.env2.sustain,now);

        modOsc.connect( modOsc1Gain );
        modOsc.connect( modOsc2Gain );
        modOsc1Gain.connect( osc1.frequency );	// tremolo
        modOsc2Gain.connect( osc2.frequency );	// tremolo

        osc1.connect( osc1Gain );
        osc2.connect( osc2Gain );
        osc1Gain.connect(oscAmp);
        osc2Gain.connect(oscAmp);
        oscAmp.connect(masterGainNode);
        
    
        osc1.start(0);
        osc2.start(0);

        notes[note] =  {
            "note" : note,
            "osc1" : osc1,
            "osc1Gain" : osc1Gain,
            "osc2" : osc2,
            "osc2Gain" : osc2Gain,
            "amp" : oscAmp,
            "filters" : filters
        }
    }

    
    this.muteNote = function(note){
        if(note in notes && notes[note] != undefined){
            var noteObj, now, voiceOff, filterOff;
            noteObj = notes[note];
            now = context.currentTime;
            voiceOff = now + envMaxRel * controller.env2.release + 0.03;
            noteObj.osc1Gain.gain.cancelScheduledValues(now);
            noteObj.osc1Gain.gain.setValueAtTime(noteObj.osc1Gain.gain.value, now);
            noteObj.osc1Gain.gain.linearRampToValueAtTime(0,voiceOff);
            noteObj.osc2Gain.gain.cancelScheduledValues(now);
            noteObj.osc2Gain.gain.setValueAtTime(noteObj.osc2Gain.gain.value, now);
            noteObj.osc2Gain.gain.linearRampToValueAtTime(0,voiceOff);
            noteObj.filters.forEach(function(filter,key){
                filterOff = now + envMaxRel * controller.env1.release + 0.01;
                filter.frequency.cancelScheduledValues(now);
                filter.frequency.linearRampToValueAtTime(filterRange, filterOff+0.01);
            })
            noteObj.osc1Gain.gain.exponentialRampToValueAtTime(0.0001, voiceOff + 0.01);
            noteObj.osc1.stop(voiceOff+0.04);
            noteObj.osc2Gain.gain.exponentialRampToValueAtTime(0.0001, voiceOff + 0.01);
            noteObj.osc2.stop(voiceOff+0.04);    
            notes.slice(notes.indexOf(note),1);
            return;
        }
    }

    
    this.silenceAll = function(){
        notes.forEach(noteObj=>{
            self.muteNote(noteObj.note);
        })
    }

    this.notesForEach = function(params,value){
        for (var i = 0; i < notes.length; i++) {
            if(notes[i] != undefined){
                var note = notes[i];
                changeNested(note,params,value);
            }
        }
    }


    this.frequencyFromNoteNumber = function ( note ) {
        return 440 * Math.pow(2,(note-69)/12);
    }


    /* The midi handler is the entry point for midi messages */
    this.midiHandler = function(bytes){
        var hex, status, target, binding, value;
        hex = midi.bytesToHex(bytes);
        status = hex[0].substr(0,1);
        target = (hex[1] != undefined) ? hex[1] : "";
        value = (bytes[2] != undefined) ? bytes[2] : "";
        
        //Note on 
        if (status == "9") {
            var note = midi.hexToInt(target);
            var volume = value/127;
            self.voice(note,volume);
            return;
        }

        //Note off
        if(status == "8"){
            var note = midi.hexToInt(target);
            self.muteNote(note);
            return;
        }

        binding = getNested(midiBinding,[status,target]);
        if(binding){
            if(typeof binding === "function" ){
                binding(value);
                return;
            }else{
                var update = self.update(binding);
                if(update){
                    update(value);
                    changeNested(midiBinding,[status,target],update);
                }
            }
        }
    }

    /* Returns a function that checks update functions and changes the controller object */
    this.update = function(args){
        if(checkNested(controller,args)){
            return function(value){
                changeNested(controller,args,value/127);
                var updateFunction = getNested(updateFunctions,args);
                if(updateFunction){
                    updateFunction(value);
                }
            }
        }else{
            return false;
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

    function checkNested(obj,args) {
      for (var i = 0; i < args.length; i++) {
        if (!obj || !(args[i] in obj)) {
          return false;
        }
        obj = obj[args[i]];
      }
      return true;
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
    
    Object.defineProperty(this,"controller",{get : function(){return controller}});
    Object.defineProperty(this,"bindings",{get:function(){return midiBinding}})
    Object.defineProperty(this,"updateFunctions",{get:function(){return updateFunctions}})
    Object.defineProperty(this,"notes",{get:function(){return notes}})

    return this;
}