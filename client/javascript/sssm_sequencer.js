function SSSMSequencer(){
    var signals;
    var steps;
    var split;
    var stepsTotal;
    var self = this;
    var cycle, cyclesTotal, ppqn;
    var midi;
    var _spp,_index;
    var _openNotes, _openNotesNum;
    var _lastNoteFlag;
    var startPos,lastPos;
    var seqStepWidth, seqStepHeight;
    var seqContainer, seqBlockDivs;
    var _notes;
    var _midiPattern;
    var _state;
    var activeSeqColButton;
    var activeSeqRowButton;
    var _rpnCheck,_rpnMSB,_rpnLSB,_rpnSelect;
    var inFn;
    var _socket; 

    this.init = function(midiController, socket){
        _socket = socket;
        midi = midiController;
        _index = 0;
        _openNotes = [];
        _openNotesNum = 0;
        _lastNoteFlag = false;
        _notes = [];
        _midiPattern = [];
        _state = this.Status.Playing;
        
        ppqn = 24;
        split = 4;
        steps = 16;
        stepsTotal = steps*16;
        startPos = 0;
        seqBlockDivs = [];


        socket.on('sequence_add', function(data){
            if(data.channel !== midi.channel)return false;
            self.onSequenceAdd(data);
        });
        socket.on('sequence_split', function(data){
            if(data.channel !== midi.channel)return false;
            self.setSplit(data.split);
        });
        socket.on('sequence_remove', function(data){
            if(data.channel !== midi.channel)return false;
            self.onSequenceRemove(data);
        });        
        socket.on('sequencer_init', function(data){
            if(data.channel !== midi.channel)return false;
            self.onSequencerInit(data);
        });

        this.out = function(message,data){
            _socket.emit(message,data);
        }

        this.initFrontend();
    }

    this.initFrontend = function(){
        seqContainer = document.getElementById("sequencer");
        seqRowController = document.getElementById('row_controller');
        seqColController = document.getElementById('col_controller');
        var keys = [0,1,0,0,1,0,1,0,0,1,0,1]; //Start at gis from right to left
        keys = keys.reverse();
        var seq_rows = [];
        var roots = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
        splits = [1,2,4,8,16];

        splitSelect = document.getElementById('split_select');
        splits.forEach(function(val, i){
            var option; 
            option = document.createElement('option');
            option.setAttribute('value', Math.ceil(i * 127/(splits.length)));
            option.innerHTML = val;
            splitSelect.append(option);
        })
        splitSelect.options[2].selected = 'selected';
        splitSelect.addEventListener('change', function(e){
            console.log(e);
            self.out('sequence_split', {channel:midi.channel, split: splits[splitSelect.selectedIndex] })
        })
        for(i=0; i < split; i++){//ROW

            var row_button = document.createElement('div');
            row_button.classList.add('button');
            row_button.addEventListener('click', this.onSequencerRowButtonClick.bind(this));
            row_button.innerHTML = i;
            row_button.setAttribute('row', i );
            seqRowController.appendChild(row_button);

            var seq_row = document.createElement('div');
            seq_row.classList.add('seq_row', 'active');
            seq_row.setAttribute('row', i );

            for(j=0; j < 16; j++){ //COL
                var seq_col = document.createElement('div');
                seq_col.classList.add('seq_col', 'active');
                seq_col.setAttribute('col', j );
                
                for(var k=0; k < 128/split; k++){//ROW
                    var row, rowId;
                    rowId = 128 - (i*(128/split)+k+1); 
                    row = document.createElement("div");
                    row.classList.add("row");
                    row.setAttribute("data-tune", rowId);

                    for(var l = 0; l < steps; l++){//STEP
                        var step, stepId;
                        stepId = (j*steps) + l;
                        step = document.createElement("div");
                        step.classList.add("step");
                        step.setAttribute("data-step",stepId);
                                               
                        step.addEventListener('click',this.stepClicked.bind(this));
                        if(!keys[(rowId+keys.length+4) % keys.length]){
                            step.classList.add('white');
                        }else{
                            step.classList.add('black'); 
                        }
                        row.appendChild(step);
                    }
                    seq_col.appendChild(row);
                }
                seq_row.appendChild(seq_col);
                seq_rows.push(seq_row)
            }
            seqContainer.appendChild(seq_row);
            
        /*STANDARD KEYS*/
        // var keys = [0,1,0,1,0,0,1,0,1,0,1,0];
        // var whitePos = 0;
        // for (var i=0; i < keys.length; i++){
        //     var keyDiv, key;
        //     keyDiv = document.getElementById('keys');
            
        //     key = document.createElement('div');
        //     key.classList.add('key');
        //     key.setAttribute('sssm-key', i);
        //     key.setAttribute('sssm-input', "key");

        //     if(!keys[i]){
        //         key.classList.add('white');
        //         key.style.width = keyWidth-2 + "px";
        //         key.style.border = "1px solid #000";
        //         whitePos++;
        //     }else{
        //         key.classList.add('black'); 
        //         key.style.left = (whitePos*keyWidth-keyWidth/4) + 'px';   
        //         key.style.width = keyWidth/2 + "px";
        //     }
            
        //     keyDiv.append(key);
        // } 
            /*
            for(var i=0; i < 128/split; i++){
                var row, rowId;
                rowId = 128 - (u*(128/split) +i); 
                row = document.createElement("div");
                row.classList.add("row");
                row.setAttribute("data-tune", 127-i);
                                
                for(var j = 0; j < steps/split; j++){
                    for (k=0; k<2; k++){
                        step = document.createElement("div");
                        step.classList.add("step");
                        step.setAttribute("data-step",j);
                        step.addEventListener('click',this.stepClicked.bind(this));
                        row.appendChild(step);
                    }
                }
                seq_row.appendChild(row);
            }
            seqContainer.appendChild(seq_row);
            */
        }
        
        seqStepWidth = step.offsetWidth;
        seqStepHeight = step.offsetHeight;
        seq_rows.forEach(function(row){
            row.style.height = seqStepHeight*128/split + 'px';
            row.style.width = seqStepWidth*steps*2/split + 'px';
        })
        document.querySelector('.button[row="1"]').click();
       
        refreshBtn = document.getElementById('refresh');
        refreshBtn.addEventListener('click', this.refresh.bind(this));

        recordButton = document.getElementById("record");
        recordButton.addEventListener('click', this.toggleStatus.bind(this));
        clearButton = document.getElementById("clear");
        clearButton.addEventListener('click', this.clearSequence.bind(this));
        playButton = document.getElementById("play");
        playButton.addEventListener('click', this.startPlaying.bind(this));

        self.refresh();
    }


    this.setSplit = function(value){
        split = value;
        splitSelect.selectedIndex = splits.indexOf(value);
        seqColController.innerHTML = "";
        stepsTotal = split*steps;
        for(i=0; i < split; i++){
            var col_button = document.createElement('div');
            col_button.classList.add('button');
            col_button.addEventListener('click', this.onSequencerColButtonClick.bind(this));
            col_button.innerHTML = i;   
            col_button.setAttribute('col', i);
            seqColController.appendChild(col_button);
        }
        var btn = document.querySelector('.button[col="0"]');
        btn.click();
    }

    this.onSequencerRowButtonClick = function (e){
        var el = e.target;
        var row = el.getAttribute('row');

        var olds = seqContainer.querySelectorAll('.seq_row[row].active');
        olds.forEach(function(old){
            old.classList.remove('active');
        })

        var target = seqContainer.querySelector('.seq_row[row="'+ row+ '"]');
        target.classList.add('active');
        
        if(activeSeqRowButton) activeSeqRowButton.classList.remove('active');
        el.classList.add('active');
        activeSeqRowButton = el;

    }

    this.onSequencerColButtonClick = function (e){
        var el = e.target;
        var col = el.getAttribute('col');
        var olds = seqContainer.querySelectorAll('.seq_col[col].active');
        olds.forEach(function(old){
            old.classList.remove('active');
        })

        var targets = seqContainer.querySelectorAll('.seq_col[col="'+ col+ '"]');
        targets.forEach(function(target){
            target.classList.add('active');
        })

        if(activeSeqColButton) activeSeqColButton.classList.remove('active');
        el.classList.add('active');
        activeSeqColButton = el;
    }

    this.toggleStatus = function(){
        if(_state == this.Status.Playing){
            this.stopAll();
        }else
        if(_state == this.Status.Recording){
            this.stopRecording();    
        }else
        if(_state == this.Status.Stopped){
            this.readyRecording();
        }
    }

    this.out = function(){};

    this.stepClicked = function(e){
        var step, stepEl;
        stepEl = e.target;
        start = parseInt(stepEl.getAttribute("data-step"));
        length = 1;
        tune = parseInt(stepEl.parentElement.getAttribute("data-tune"));
        note = new Note(start, length, tune);
        this.out('sequence_add', {channel: midi.channel, note: [note.start, note.length, note.tune]});
        //this.update();
    }
    

    this.onSequenceAdd = function(data){
        note = new Note(data.note[0], data.note[1], data.note[2]);
        _notes.push(note);        
        stepEl = document.querySelector('.row[data-tune="' + note.tune + '"] .step[data-step="' + note.start + '"]');
        self.createActiveStepBlock(stepEl, note);
        //this.update();
    }

    this.onSequenceRemove = function(data){
        if(data.channel !== midi.channel)return false;
        note = new Note(data.note[0], data.note[1], data.note[2]);

        note_f = _notes.filter(function(o){return o.tune == note.tune && o.start == note.start});
        if(note.length >= 0){
            _notes.splice(_notes.indexOf(note_f[0]),1);    
        }

        stepEl = document.querySelector('.step--active[note-tune="' + note.tune + '"][note-start="' + note.start + '"]');
        self.removeActiveStepBlock(stepEl);
        //this.update();
    }

    this.onSequencerInit = function(data){
        this.clearSequence();
        this.setSplit(data.split);        
        data.notes.forEach(note=>this.onSequenceAdd({"note":note}));
    }

    this.createActiveStepBlock = function(stepEl,note){

        parentEl = stepEl.parentElement;
        blockDiv = document.createElement("div");
        blockDiv.classList.add("step--active")
        blockDiv.setAttribute("note-start",note.start);
        blockDiv.setAttribute("note-length", note.length);
        blockDiv.setAttribute("note-tune", note.tune);

        blockDiv.style.left = ((note.start+steps) % steps)*seqStepWidth + 'px';       
        blockDiv.style.top = 0;
        blockDiv.style.width = (note.length) * seqStepWidth + "px";
        blockDiv.addEventListener("click", this.stepActiveClick.bind(this));
        seqBlockDivs.push(blockDiv);
        parentEl.appendChild(blockDiv);
        
        //seqContainer.appendChild(blockDiv);
    }   

    this.stepActiveClick = function(e){
        var step, stepEl;
        stepEl = e.target;
        start = parseInt(stepEl.getAttribute("note-start"));
        length = parseInt(stepEl.getAttribute("note-length"));
        tune = parseInt(stepEl.getAttribute("note-tune"));
        note = new Note(start, length, tune);
        this.out('sequence_remove', {channel: midi.channel, note: [note.start, note.length, note.tune]});
        //this.update();
    }

    this.refresh = function(){
        self.clearSequence();
        this.out('sequencer_init', {channel: midi.channel});
    }

    this.removeActiveStepBlock = function(el){
        if(!el) return false;
        el.parentNode.removeChild(el);
        seqBlockDivs.splice(seqBlockDivs.indexOf(el),1);
        //this.update();
    };

    this.clearSequence = function(){
        seqBlockDivs.forEach(function(o){
            o.parentNode.removeChild(o);
        })
        _notes = [];
        _midiPattern = [];
        seqBlockDivs = [];
    }

    this.midiPatternToNotes = function(){
        var noteBuffer,blocks;
        noteBuffer = []
        blocks = []
        _midiPattern.forEach(function(o,step){
            o.forEach(function(midi){
                noteTune = midi[1];
                if(midi[0] == "9"){
                    noteBuffer[noteTune] = step
                }
                if(midi[0] == "8"){
                    if(noteBuffer[noteTune] != undefined){
                        var noteStart, noteLenght, noteTune, note;
                        noteStart = noteBuffer[noteTune];
                        noteLenght = step - noteBuffer[noteTune];
                        note = new Note(noteStart, noteTune, lenght)
                        noteBuffer[noteTune] = undefined;
                    }
                }
            });
        })
    }

    this.update = function(){
        this.notesToMidiPattern();
    }
    
    this.notesToMidiPattern = function(){
        _midiPattern = [];
        _notes.forEach(function(o){
            var pStart, pStop, pTune;
            pStart = o.start & (steps * split-1);
            pStop = (o.start + o.length) & (steps * split - 1);
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

    

    this.readyRecording = function(){
        console.log("Record Ready");
        _state = this.Status.Ready;
    }

    this.startRecording = function(){
        console.log("Start Recording")
        _midiPattern = [];
        _openNotes = [];
        _hasOpenNotes = 0;
        _lastNoteFlag = false;
        startPos = _spp;
        //cyclesTotal = 0;
        cycle = 0;
        _state = this.Status.Recording;
    }

    this.stopRecording = function(){
        console.log("Recording Stopped");
        var cycles;
        //cycles = Math.ceil(_midiPattern.length/steps); 
        //cyclesTotal = cycles + (cycles % 2);
        // openEnds.forEach(function(e,key){
        //     if(e == true){
        //         self.pattern[steps*cyclesTotal-1] = ["8",key,"7f"];
        //     }
        // })
        this.update();
        _notes.forEach(function(n){
            self.createStepBlock([n.start, n.length, n.tune])
        })
        this.startPlaying();
    }

    this.record = function(status,target,hexvalue){
        var stepData, noteBuffer;
        var noteStart, noteTune, noteLength;
        //index = _spp - startPos;
        // if(_midiPattern[_index] == undefined){
        //     _midiPattern[_index] = [];
        // }
        // console.log(status + target + hexvalue);
        // _midiPattern[_index].push([status,target,hexvalue]);
        
        noteTune = midi.hexToInt(target);
        if(status == "9"){
            if(_lastNoteFlag) return false;
            _openNotes[noteTune] = _index;
            _openNotesNum++;
            return;    
        }
        if(status == "8"){
            var note;
            noteStart = _openNotes[noteTune];
            noteLength = _index - _openNotes[noteTune];
            if(noteLength == 0) return false;
            if(noteLength < 0 ) noteLength = steps * split;
            note = new Note(noteStart, noteTune, noteLength);
            _notes.push(note);
            _openNotes.splice(noteTune,1);
            _openNotesNum--;
            if(_lastNoteFlag && _openNotesNum == 0){
                this.stopRecording();
            }
            return note;    
        }
    };

    this.stopAll = function(){
        _state = this.Status.Stopped;
    }

    
    this.startPlaying = function(){
        console.log(_midiPattern);
        _state = this.Status.Playing;
    }
    
    this.tick = function(){      
        _index = _spp % (steps * split);
        if (_state == this.Status.Ready && _index == 0) {
            this.startRecording();
            return;
        }

        if(_state == this.Status.Recording && _index == 0){
            if(_openNotesNum > 0){
                _lastNoteFlag = true;
            }else{
                this.stopRecording();    
            }
        }

        if (_state == this.Status.Playing){
            if(_index != lastPos){
                lastPos = _index;
                //this.play(_index);
            }
        }
        
    }

    this.play = function(index){
        if(_midiPattern[index]){
            _midiPattern[index].forEach(function(value){
                midi.outHex([value[0],value[1],value[2]]);
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
                // msb = hexvalue.substr(0,2);
                // msb = midi.hexToInt(msb);
                // lsb = hexvalue.substr(2,2);
                // lsb = midi.hexToInt(lsb);
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
        
        /* if(status == "b"){
            if(target == "60"){
                if(_state == this.Status.Playing){
                    this.stopAll();
                }else
                if(_state == this.Status.Recording){
                    this.stopRecording();    
                }else
                if(_state == this.Status.Stopped){
                    this.readyRecording();
                }
                return;
            }
        } */
        
        /* if(status == "8" || status == "9"){
            if(_state == this.Status.Recording){
                this.record(status,target,hexValue);
            }
        } */
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
    return this;
}).call(new Object());