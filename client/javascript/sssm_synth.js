function SSSMSynth(){

}

SSSMSynth.prototype = (function(){
    var maxSteps, currentStep, lastStep;
    var instrument;
    var midi,midiFunctions
    var leds;
    var waveforms,filters,multiplier;
    var keyWidth;


    this.init = function(midiIo, data){
        currentStep = 0;
        maxSteps = 16;
        keyWidth = 50;
        instrument = data;
        leds = [];
        waveforms = ["sine","square","sawtooth","triangle"];
        filters = ["lowpass","highpass","bandpass","lowshelf","highshelf"];
        multiplier = [1,2,4,8];
        midi = midiIo;
        midiFunctions = {}
        this.initFrontend();
    }

    this.initFrontend = function(){
        var select = document.querySelectorAll('select.waveform');
        for (var i = 0; i < select.length; i++) {
            var elList = select.item(i);
            for (var j = 0; j < waveforms.length; j++) {
                var elItem = document.createElement('option');
                elItem.innerHTML = waveforms[j];
                elItem.value = Math.ceil(j * 127/(waveforms.length));
                elList.appendChild(elItem);
            }
        }

        var select = document.querySelectorAll('select.multiplier');
        for (var i = 0; i < select.length; i++) {
            var elList = select.item(i);
            for (var j = 0; j < multiplier.length; j++) {
                var elItem = document.createElement('option');
                elItem.innerHTML = multiplier[j];
                elItem.value = Math.ceil(j * 127/(multiplier.length));
                elList.appendChild(elItem);
            }
        }

        var select = document.querySelectorAll('select.filter');
        for (var i = 0; i < select.length; i++) {
            var elList = select.item(i);
            for (var j = 0; j < filters.length; j++) {
                var elItem = document.createElement('option');
                elItem.innerHTML = filters[j];
                elItem.value = Math.ceil(j * 127/(filters.length));
                elList.appendChild(elItem);
            }
        }

        var channel = document.getElementById('channel');
        for(var i=0; i<16; i++){
            var option; 
            option = document.createElement('option');
            option.setAttribute('value', i);
            option.innerHTML = i+1;
            channel.append(option);
        }
        channel.addEventListener('change', function(obj){
            sssm.apps.synth.midi.init(channel.selectedIndex);
            sssm.apps.sequencer.midi.init(channel.selectedIndex);
            sssm.apps.sequencer.app.refresh();            
            socket.emit('refresh');
            
        })
        channel.options[midi.channel].selected = 'selected';


        muteAllBtn = document.getElementById('muteAll');
        muteAllBtn.addEventListener('click', function(e){
            midi.outHex(['B','7B','00']);
        })

        /*PENTATONIC SCALES*/
        var roots, scales, octaves, octaveSelect, rootSelect, scaleSelect;
        octaves = [-1,0,1,2,3,4,5,6];
        octaveSelect = document.getElementById('octave');
        octaves.forEach(function(val, key){
            var option; 
            option = document.createElement('option');
            option.setAttribute('value', key);
            option.innerHTML = val;
            octaveSelect.append(option);
        })
        octaveSelect.options[4].selected = 'selected';
        octaveSelect.addEventListener('change', updateKeys)

        roots = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
        rootSelect = document.getElementById('root');
        roots.forEach(function(val, key){
            var option; 
            option = document.createElement('option');
            option.setAttribute('value', key);
            option.innerHTML = val;
            rootSelect.append(option);
        })
        rootSelect.addEventListener('change', updateKeys)
        
        scales = {
            'minor' : [2,1,2,2,1,2,2],
            'major' : [2,2,1,2,2,2,1]
        }
        scaleSelect = document.getElementById('scale');
        for(var scale in scales){
            var option; 
            option = document.createElement('option');
            option.setAttribute('value', scale);
            option.innerHTML = scale;
            scaleSelect.append(option);
        }
        scaleSelect.options[1].selected = 'selected';
        scaleSelect.addEventListener('change', updateKeys)

        function updateKeys(){
            var scale, octave, root, keyDiv, note, baseNote;
            scale = scales[scaleSelect.options[scaleSelect.selectedIndex].text];
            octave = octaves[octaveSelect.selectedIndex];
            root = rootSelect.selectedIndex;
            keyDiv = document.getElementById('keys');
            keyDiv.innerHTML = "";
            baseNote = (octave*12)+ root;
            note = baseNote; 

            for (var i=0; i < 8; i++){
                var key;
                key = document.createElement('div');
                key.classList.add('key');
                key.setAttribute('sssm-key', note);
                key.setAttribute('sssm-input', "key");
                key.classList.add('white');
                key.style.width = keyWidth-2 + "px";
                key.style.border = "1px solid #000";

                note += + scale[i % scale.length];
                keyDiv.append(key); 
            }
        }
        updateKeys();

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
    }


    this.midiHandler = function(bytes){
    };

    return this;
}).call(new Object)
