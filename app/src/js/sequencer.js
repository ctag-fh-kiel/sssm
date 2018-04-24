function SSSMSequencer(){
    var signals;
    var steps;
    var tempo = 140;
    var fit = true;
    var startTime;
    var secondsPerStep;
    var self = this;
    var cycle, cyclesTotal, cycleArray, ppqn;
    var midi;
    var _spp;
    var _notes;
    var _midiPattern;
    var startPos,lastPos;
    _midiPattern = [];
    this.state = this.Status.Playing;
    this.send = function(){};

    this.init = function(midiController, socket){
        midi = midiController;
        ppqn = 24;
        steps = 16;
        _index = 0;
        cyclesTotal = 4;
        startPos = 0;
        _notes = [];
        cycleArray = [1,2,4,8,16];
        
        socket.on('sequence_add', function(event, data){
            if(midi.channel !== data.channel)return false;
            self.onSequenceAdd(data);
        })

        socket.on('sequence_remove', function(event, data){
            if(midi.channel !== data.channel)return false;
            self.onSequenceRemove(data);
        })

        socket.on('sequencer_init', function(event,data){
            if(midi.channel !== data.channel)return false;
            self.onSequencerInit(data);
        });

        socket.on('sequence_split', function(event,data){
            if(midi.channel !== data.channel)return false;
            cyclesTotal = data.split;
            this.send('sequence_split', {channel:midi.channel, split: data.split})
        });
    }

    this.onSequencerInit = function(data){
        this.send('sequencer_init', {channel: midi.channel, notes: _notes.map(note => note.toArray()), split:cyclesTotal });
    }

    this.onSequenceAdd = function(data){
        note = new Note(data.note[0], data.note[1], data.note[2]);
        _notes.push(note);
        this.send('sequence_add', {channel: midi.channel, note: data.note});
        this.update();       
    }

    this.onSequenceRemove = function(data){
        note = new Note(data.note[0], data.note[1], data.note[2]);
        note_f = _notes.filter(function(o){return o.tune == note.tune && o.start == note.start});
        if(note.length >= 0){
            _notes.splice(_notes.indexOf(note_f[0]),1);    
        }
        this.send('sequence_remove', {channel: midi.channel, note: data.note});
        this.update();       
    }

    this.readyRecording = function(){
        console.log("Record Ready");
        this.state = this.Status.Ready;
    }

    this.startRecording = function(){
        console.log("Start Recording")
        _midiPattern = [];
        startPos = _spp;
        cyclesTotal = 0;
        cycle = 0;
        this.state = this.Status.Recording;
    }

    this.stopRecording = function(){
        console.log("Recording Stopped");
        var cycles;
        cycles = Math.ceil(_midiPattern.length/steps); 
        cyclesTotal = cycles + (cycles % 2);
        this.startPlaying();
    }

    this.record = function(status,target,hexvalue){
        var index;
        index = _spp - startPos;
        if(_midiPattern[index] == undefined){
            _midiPattern[index] = [];
        }
        _midiPattern[index].push([status,target,hexvalue]);
    };

    this.stopAll = function(){
        this.state = this.Status.Stopped;
    }

    this.clear = function(){
        _midiPattern = [];
    }
    
    this.startPlaying = function(){
        this.state = this.Status.Playing;
    }

    this.update = function(){
        this.notesToMidiPattern();
    }

    this.clearSequence = function(){
        _notes = [];
        _midiPattern = [];
    }    

    this.notesToMidiPattern = function(){
        _midiPattern = [];
        _notes.forEach(function(o){
            var pStart, pStop, pTune;
            pStart = o.start & (steps * cyclesTotal-1);
            pStop = (o.start + o.length) & (steps * cyclesTotal - 1);
            pTune = midi.intToHex(o.tune);
            
            if(_midiPattern[pStart] == undefined){
                _midiPattern[pStart] = [];
            }
            _midiPattern[pStart].push(["9",pTune,"7f"]);
            

            if(_midiPattern[pStop] == undefined){
                _midiPattern[pStop] = [];
            }
            _midiPattern[pStop].push(["8",pTune,"7f"]);
            
        })

        return _midiPattern;
    }

    
    this.tick = function(){
                
        /*  if (this.state == this.Status.Ready && _spp % steps == 0) {
            this.startRecording();
            return;
        } */

        var index;
        if (this.state == this.Status.Playing){
            index = _spp % (steps * cyclesTotal);
            if(index != lastPos){
                lastPos = index;
                this.play(index);
            }
        }
    }

    this.play = function(index){
        if(_midiPattern[index]){
            _midiPattern[index].forEach(function(value){
                midi.outHex(value);
            })
        }
    };


    this.midiHandler = function(bytes){
        var hex, status, target, value;
        hex = midi.bytesToHex(bytes);
        status = hex[0].substr(0,1);
        target = hex[1] || "";
        hexvalue = hex[2] || "";
        value = bytes[2];
        if(status == "f"){
            if(target == "2"){
                var value,msb,lsb;
                msb = bytes[1];
                lsb = bytes[2];
                value = msb * 127 + lsb;
                _spp = value;
                this.tick();
            }
            if(target == "8"){
                //this.tick();
            }
            return;
        }
      
        if(status == "b"){

            if(target == "60"){
                if(this.state == this.Status.Playing){
                    this.stopAll();
                }else
                if(this.state == this.Status.Recording){
                    this.stopRecording();    
                }else
                if(this.state == this.Status.Stopped){
                    this.readyRecording();
                }
                return;
            }
        }
        
        if(this.state == this.Status.Recording){
            this.record(status,target,hexvalue);
        }
    }
}

SSSMSequencer.prototype.Status = {
    "Ready" : "SequencerReady",
    "Playing" : "SequencerPlaying",
    "Recording" : "SequencerRecording",
    "Stopped" : "SequencerStopped"
}


function Note(start,tune,length){
    this.start = start;
    this.tune = tune;
    this.length = length;
    this.init(start, tune, length);
}

Note.prototype = (function(){
    var self;
    this.init = function(){
        self = this;
    }    
    this.toArray = function(){
        return [this.start,this.tune,this.length]
    }
    return this;
}).call(new Object());
