/* Midi Clock to be used by the instruments. 
Using F2 Signals to transmit song position and F8 Signals for Clock ticks.
It can be set to external mode, to use an external clock. 
It is still recommended to tunnel the external clock through this module  */

function SSSMClock(midi){
    this.onTick = function(){}
    this.spp = 0;
    this.spqn = 0;
    this.bpm = 120;
    this.ppqn = 24;
    this.time = 0;
    this.mode = 'internal';
    this.init(midi);
}

SSSMClock.prototype = (function(){
    var self;
    var last, next, midi;
    var tickCount;
    var tickTime;
    var playFlag = false;
  
    
    this.init = function(MidiController){
        midi = MidiController;
        tickCount = 0;
        self = this;
    }

    this.start = function(){
        if (playFlag || this.mode == 'external') return false;
        self.spp = 0;
        self.time = 0;
        playFlag = true;
        tickCount = 0;
        last = Date.now();
        self.loop();
    }

    this.stop = function(){
        playFlag = false;
    }

    this.continue = function(){
        if(this.mode == 'internal'){
            playFlag = true;
            self.loop();
        }
    }

    this.loop = function(){
        var time;
        tickTime = 60 * 1000 / (self.bpm * self.ppqn);
        self.spqn = 60 / self.bpm;
        next = last + tickTime;
        time = Date.now();
        if(time >= next){
            self.time += tickTime;
            last = next;
            self.tick()
        }

        if(playFlag){   
            window.requestAnimationFrame(self.loop);
        }
    }

    this.tick = function(){
        tickCount++;
        self.onTick();
        midi.outHex(['f8']);
        if(tickCount % 6 == 0){
            self.spp ++;
            var msb = Math.floor(self.spp/127);
            var lsb = self.spp % 127;
            var hexValue = midi.intToHex(msb) + midi.intToHex(lsb);
            midi.out([242, msb, lsb]); //F2
        }
    }


    this.switchMode = function(mode){
        if (mode == 'internal' || mode == 'external') {
            this.mode = mode;
            return true;
        }
        if(this.mode == 'internal'){
            this.mode = 'external';
            this.off();
        }else if(this.mode == 'external'){
            this.mode = 'internal';
            this.on();
        }
    }

    this.off = function(){
        this.mode == 'external';
        playFlag = false;
    }

    this.on = function(){
        this.mode == 'internal'
        playFlag == true;
    }
    
    this.midiHandler = function(message){
        var hexMessage, status, target, hexValue, binding;        
        hexMessage = midi.bytesToHex(message);
        status = hexMessage[0].substr(0,1);
        target = hexMessage[1];
        hexValue = hexMessage[2];

        if(status == "f"){
            if( this.mode == "external" && target == "8"){
                this.tick();
            }
            if(target== "a"){
                this.start();
                _nextStep = 0;
            }
            if(target== "c"){
                this.stop();
            }    
        }
        if(status == "b"){
            if(target == "10"){
                this.bpm = midi.hexToInt(hexValue);
            }
        }
    }
    return this;

}).call(new Object());