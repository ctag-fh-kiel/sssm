function SSSMDrumkit(){

}

SSSMDrumkit.prototype = (function(){
    var maxSteps, currentStep, lastStep;
    var instrument;
    var midi, midiFunctions
    var leds;
    var songPos, seqPos, seqRes;
    var clock; 

    this.init = function(midiIo,data){
        currentStep = 0;
        maxSteps = 16;
        instrument = data;
        leds = [];
        midi = midiIo;
        midiFunctions = {
            "f" : {
                "8" : this.tick,
                "2" : function(hexValue){
                    var msb,lsb,hex; 
                    msb = hexValue.substr(0,2);
                    msb = midi.hexToInt(msb);
                    lsb = hexValue.substr(2,2);
                    lsb = midi.hexToInt(lsb);
                    songPos = msb*127 + lsb;
                }
            },
            "b" : {

            }
        }

        this.initButtons();
        this.initFrontend();
    }

    this.initFrontend = function() {
        //EFFECT LiST
        var elList = document.getElementById('effectSelect');
        var numEffects = instrument.impulseResponseList.length;
        for (var i = 0; i < numEffects; i++) {
            var elItem = document.createElement('option');
            elItem.innerHTML = instrument.impulseResponseList[i].name;
            elItem.value = Math.ceil(i * 127/(numEffects));
            elList.appendChild(elItem);
        }

        //KIT LIST
        var elList = document.getElementById('kitSelect');
        var numKits = instrument.kitList.length;
        for (var i = 0; i < numKits; i++) {
            var elItem = document.createElement('option');
            elItem.innerHTML = instrument.kitList[i].pretty;
            elItem.value = Math.ceil(i * 127/numKits);
            elList.appendChild(elItem);
        }

        var elList = document.getElementById('filterSelect');
        var numFilters = instrument.filters.length;
        elList.setAttribute("sssm-range",numFilters);
        for (var i = 0; i < numFilters; i++) {
            var elItem = document.createElement('option');
            elItem.innerHTML = instrument.filters[i];
            elItem.value = Math.ceil(i * 127/numFilters);
            elList.appendChild(elItem);
        }
    }

    this.initButtons = function() {
        var elButton;
        for (j = 0; j < instrument.tracks.length; j++) {
            var track = document.getElementById(instrument.tracks[j]);
            if(track){
                for (i = 0; i < instrument.controller.main.loopSteps; ++i) {
                    elButton = document.createElement('div');
                    var lsb = midi.intToHex(j*16+i),
                        msb = "04",
                        cc  = "63"; 
                    elButton.classList.add('button','button--step')
                    elButton.setAttribute("sssm-input", "button--step");
                    elButton.setAttribute("midi-value", "1");
                    elButton.setAttribute("midi-lsb",lsb);
                    elButton.setAttribute("midi-msb",msb);
                    elButton.setAttribute("midi-cc", cc);
                    track.appendChild(elButton);
                }
            }
        }

        var ledrow = document.getElementById('time')
        for (i = 0; i < instrument.controller.main.loopSteps; ++i) {
            var el = document.createElement('div');
            el.classList.add('led')
            el.setAttribute("sssm-value","off");
            el.setAttribute("sssm-target",i);
            ledrow.appendChild(el);
            leds.push(el);
        }

    }

    this.midiHandler = function(bytes){
        var hex, status, target, value;
        hex = midi.bytesToHex(bytes);
        status = hex[0].substr(0,1);
        target = hex[1];
        hexValue = hex.slice(2).join("");
        if (status in midiFunctions && target in midiFunctions[status]) {
            var value;
            midiFunctions[status][target](hexValue);
            return;
        }
    }

    this.tick = function(){
        var currentStep, step;
        currentStep = songPos % maxSteps;
        step = leds[currentStep];
        if(step && step != lastStep){
            step.setAttribute('sssm-value','on');
            if(lastStep != undefined){
                lastStep.setAttribute('sssm-value','off');
            }
            lastStep = step;
        }
    }


    var randomGo = true;
    this.randomTestStop = function(){
        randomGo = false;
    }

    this.randomTest = function(){
        var randomTimer = Date.now();
        var randomTimeout = 500;
        var randomParams= ["01","20","21","63"];
        var randomMSBParams = ["04","05"];
        var randomVal = ["01","40","7f"];

        randomGo =true;
        function start(){
            if(Date.now() > randomTimer){
                randomTimer += randomTimeout;
                var param = randomParams[parseInt(Math.random()*randomParams.length)];
                var val = midi.intToHex(parseInt(Math.random()*127));
                if(param == "63"){
                    var randomMSB = randomMSBParams[parseInt(Math.random()*randomMSBParams.length)];
                    var randomLSB = midi.intToHex(parseInt(Math.random()*127));
                    midi.send("B",param,randomMSB);
                    midi.send("B","62",randomLSB);
                    if (randomMSB == 4) {
                        val = randomVal[parseInt(Math.random()*randomVal.length)];
                    }
                    midi.send("B","06",val);
                }else{
                    midi.send("B",param,val);
                }
            }
            setTimeout(function(){
                if(randomGo){
                    start();
                }
            },Math.random()*200);
        }
        start();
    }

    return this;
}).call(new Object)
