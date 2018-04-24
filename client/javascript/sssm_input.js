function SSSMInput(){

}

SSSMInput.prototype = (function(){
    var self = this;
    var inputCapture,inputTimer,inputTimeout;
    var _rpnCheck,_rpnMSB,_rpnLSB,_rpnSelect;
    var midi;
    var lastDeg, currentDeg, startDeg, snap;

    this.init = function(midiIo){
        inputTimeout = 100
        midi = midiIo;
        rpnCheck = 0;
        lastDeg = 0;
        startDeg = -1;
        snap = 20;

        var elBody = document.body;

        elBody.addEventListener('mousedown', self.handleMouseDown,true);
        elBody.addEventListener('change', self.handleChange,true);
        elBody.addEventListener('dblclick', self.handleMouseDoubleClick,true);
        elBody.addEventListener('mousemove', self.handleMouseMove,true);
        elBody.addEventListener('mouseup', self.handleMouseUp,true);
        elBody.addEventListener('touchstart', self.handleMouseDown,{passive:false});
        elBody.addEventListener('touchend', self.handleMouseUp,{passive:false});
        elBody.addEventListener('touchmove', self.handleMouseMove,{passive:false});

        document.querySelectorAll('.knob').forEach(function(vals){
            vals.style.transform = "rotate("+snap+"deg)"
            vals.rotation = snap;
        })

        var sssmInputs = document.querySelectorAll('[sssm-input]');
        sssmInputs.forEach(function(el){
            var type, midi; 
            type = el.getAttribute('sssm-input');
            midi = el.getAttribute('midi-cc');
            msb = el.getAttribute('midi-msb');
            lsb = el.getAttribute('midi-lsb');
            def = el.getAttribute('sssm-default');
            if(type == "slider--x"){
                var bar, label, thumb, track;
                
                el.removeAttribute('midi-cc');
                el.classList.add('slider--x', 'slider');
                
                bar = document.createElement('div');
                bar.classList.add('bar');

                label = document.createElement('label');
                label.classList.add('label');
                label.innerHTML = el.innerHTML;
                el.innerHTML = '';

                thumb = document.createElement('div');
                thumb.classList.add('thumb');
                thumb.setAttribute('sssm-input', type);
                thumb.setAttribute('midi-cc', midi);   
                thumb.setAttribute('midi-msb', msb);
                thumb.setAttribute('midi-lsb',lsb);
                if(def){
                    thumb.setAttribute('sssm-default',def);
                }
                
                track = document.createElement('div');
                track.classList.add('track');

                bar.appendChild(thumb);
                bar.appendChild(track);
                el.appendChild(label);                
                el.appendChild(bar);
            }
        })

    }

    /////////////////
    //INPUT HANDLER//
    /////////////////

    //GLOBAL

    this.handleMouseDown = function(event){
        var el = event.target;
        var input = el.getAttribute("sssm-input");
        inputCapture = el;        
        if(input in inputEvents.mouseDown)
            inputEvents.mouseDown[input](event);
    }

    this.handleMouseDoubleClick = function(event){
        var el = event.target;
        var input = el.getAttribute("sssm-input");
        if(input in inputEvents.doubleClick)
            inputEvents.doubleClick[input](event);
    }

    this.handleMouseMove = function(event) {
        if (!inputCapture) return;
        var el = inputCapture;
        var input = el.getAttribute("sssm-input");
        if(input in inputEvents.mouseMove)
            inputEvents.mouseMove[input](event);
    }

    this.handleMouseUp = function(event){
        if(!inputCapture) return;
        var el = inputCapture;
        var input = el.getAttribute("sssm-input");
        if(input in inputEvents.mouseUp)
            inputEvents.mouseUp[input](event);
        inputCapture = null;

    }

    this.handleChange = function(event){
        var el = event.target;
        var input = el.getAttribute("sssm-input");
        if(input in inputEvents.change){
            inputEvents.change[input](event);
        }
    }

    //TYPE
    this.handleButtonStepDown = function(event){
        event.preventDefault();
        var el = event.target;
        var value = parseInt(el.getAttribute('midi-value'));
        var nextVal = (252+value-1)%189+1;
        self.toMidi(el,nextVal);
        self.update(el,nextVal);
    }


    this.handleButtonOnOffDown = function(event){
        event.preventDefault();
        var el = event.target;
        var value = parseInt(el.getAttribute('midi-value'));
        var nextVal = (value + 127) % 254;
        self.toMidi(el,nextVal);
        self.update(el,nextVal);
    }

    this.handleSliderDown = function(event){
        var el = event.target;
        var pos = event;
        if (event.type == "touchstart") {
            if (event.touches.length < 2) {
                event.preventDefault();
                pos = event.touches[0];
            }
        }

        inputTimer = Date.now();
        // calculate offset of mousedown on slider
        var input = el.getAttribute("sssm-input");
        var target = el.getAttribute("sssm-target");
        if (input = "slider-x") {
            var thumbX = 0;
            do {
                thumbX += el.offsetLeft;
            } while (el = el.offsetParent);

            inputCaptureOffset = pos.pageX - thumbX;
        } else {
            var thumbY = 0;
            do {
                thumbY += el.offsetTop;
            } while (el = el.offsetParent);

            inputCaptureOffset = pos.pageY - thumbY;
        }
    }

    this.handleKnobDown = function(event){
        var el = event.target;
        var pos = event;
        if (event.type == "touchstart") {
            if (event.touches.length < 2) {
                event.preventDefault();
                pos = event.touches[0];
            }
        }

        inputCapture = event.target;
        lastDeg = inputCapture.rotation || 0;
        startDeg = -1;
        inputTimer = Date.now();
    }

    this.handleKnobMove = function(event){
        if(Date.now() < inputTimer)return;
        var pos, el, offsetX, offsetY, relX,relY, vLength, bx,by,ax,ay,deg, tmp, rot;
        pos = event;
        if (event.type == "touchmove") {
            if (event.touches.length < 2) {
                event.preventDefault();
                pos = event.touches[0];
            }
        }
        inputTimer += inputTimeout;
        el = inputCapture;
        offsetX = 0;
        offsetY = 0;
        elSize = el.clientHeight;

        elOffset = el;
        do {
            offsetY += elOffset.offsetTop;
            offsetX += elOffset.offsetLeft;
        } while (elOffset = elOffset.offsetParent);
        relX = pos.pageX - offsetX - elSize/2;
        relY = offsetY - pos.pageY + elSize/2;

        vLength = Math.sqrt(relX*relX + relY*relY);
        bx = 0;
        by = 1;
        ax = relX/vLength;
        ay = relY/vLength;
        deg = Math.atan2(ax,ay)*180/Math.PI+180;
        if(startDeg == -1){
            startDeg = deg;
        }
        tmp = Math.floor((deg-startDeg) + inputCapture.rotation);     
        if(tmp < 0){
            tmp = 360 + tmp;
        }
        else if(tmp > 359){
            tmp = tmp % 360;
        }   
        if(Math.abs(tmp - lastDeg) > 180){
            return false;
        }
        rot = tmp;
        if(tmp < snap) {
            rot = snap;
            tmp = snap;
        }

        currentDeg = tmp;
        lastDeg = tmp;
        el.style.transform = "rotate("+rot+"deg)";
        var midiValue = parseInt(127*((tmp-snap)/(359-snap)));
        self.toMidi(el,midiValue);
    }

    this.handleKnobUp = function(e){
        var el;
        el = inputCapture;
        el.rotation = currentDeg;
    }

    function getSliderValue(el){

    }

    this.handleSliderMouseMove = function(event){
        if(Date.now() < inputTimer)return;
        var pos = event;
        if (event.type == "touchmove") {
            if (event.touches.length < 2) {
                event.preventDefault();
                console.log('test')
                pos = event.touches[0];
            }
        }
        inputTimer += inputTimeout;
        var elThumb = inputCapture;
        var elTrack = elThumb.parentNode;
        var input = elThumb.getAttribute("sssm-input");
        var thumbSize,trackSize,travelMax
        var trackOff = 0,
            offset = 0;
        var value;

        if (input == "slider--y") {
            thumbSize = elThumb.clientHeight;
            trackSize = elTrack.clientHeight;
            travelMax = trackSize - thumbSize;

            var el = elTrack;
            do {
                trackOff += el.offsetTop;
            } while (el = el.offsetParent);

            offset = Math.max(0, Math.min(travelMax, pos.pageY - inputCaptureOffset - trackOff));
            value = 1.0 - offset / travelMax;
            elThumb.style.top = travelMax * (1.0 - value) + 'px';
        }
        else if (input == "slider--x") {
            thumbSize = elThumb.clientWidth;
            trackSize = elTrack.clientWidth;
            travelMax = trackSize - thumbSize;

            var el = elTrack;
            do {
                trackOff += el.offsetLeft;
            } while (el = el.offsetParent);

            offset = Math.max(0, Math.min(travelMax, pos.pageX - inputCaptureOffset - trackOff));
            value = offset / travelMax;
            elThumb.style.left = travelMax * value + 'px';
        }
        var midiValue = Math.ceil(127*value);
        self.toMidi(inputCapture,midiValue);
    }

    this.handleSliderDoubleClick = function(event){
        var elThumb = event.target;
        var input = elThumb.getAttribute("sssm-input");
        var def = elThumb.getAttribute('sssm-default');

        if(input == undefined) return false;
        if (input == "slider--y") {

            var states = {
                "top": function(el){
                   self.update(el,127)
                   self.toMidi(el,127)
                }, 
                "center" : function(el){
                    self.update(el,63)
                    self.toMidi(el,63)
                }, 
                "bottom" : function(el){
                    self.update(el,0)
                    self.toMidi(el,0)
                }}
            var stateFn = states[def] || states["bottom"];
               
        }
        else if (input == "slider--x") {
            var states = {
                "right": function(el){
                   self.update(el,127)
                   self.toMidi(el,127)
                }, 
                "center" : function(el){
                    self.update(el,63)
                    self.toMidi(el,63)
                }, 
                "left" : function(el){
                    self.update(el,0)
                    self.toMidi(el,0)
                }}
            var stateFn = states[def] || states["left"];
        }          
        if(stateFn != undefined){
            stateFn(elThumb);
        }  
    }

    this.handleSelectChange = function(event){
        var el = event.target;
        var target =  el.options.item(el.selectedIndex);
        var value = parseInt(target.value)
        self.toMidi(el,value);
        self.update(el,value);
    }

    this.handleInputChange = function(event){
        var el = event.target;
        var target = el.getAttribute('midi-cc');
        var value = parseInt(el.value);

        self.toMidi(el,value);
        self.update(el,value);
    }

    this.handleKeyDown = function(event){
        var el = event.target;
        var value = parseInt(el.getAttribute('sssm-key'));
        var key = midi.intToHex(value);
        inputCapture = el;
        midi.outHex(['9',key,'7E']);
    }

    this.handleKeyUp = function(event){
        var el = inputCapture;
        var value = parseInt(el.getAttribute('sssm-key'));
        var key = midi.intToHex(value);
        midi.outHex(['8',key,'7E']);

    }

    this.update = function(el,value){ //Range 1-127
        var input = el.getAttribute('sssm-input');
        if(input == "slider--y"){
            var track = el.parentNode;
            var travelMax = track.clientHeight - el.clientHeight;
            el.style.top = travelMax * (1-(value/127)) + "px";
        }
        if(input == "slider--x"){
            var track = el.parentNode;
            var travelMax = track.clientWidth - el.clientWidth;
            el.style.left = travelMax * ((value/127)) + "px";
        }
        if(input == "select"){
            var range = el.length;
            el.selectedIndex = parseInt(value/127*range);
        }
        if(input == "input"){
            el.value = value;
        }
        if(input == "knob"){
            var degree = value/127*(359-snap)+snap;
            el.style.transform = "rotate("+degree+"deg)"
            el.rotation = degree;
        }
        el.setAttribute('midi-value',value);
    }

    this.updateBySelector = function(selector,value){
        var select = document.querySelectorAll(selector);
        for (var i = 0; i < select.length; i++) {
            el = select.item(i);
            self.update(el,value);
        }
    }

    this.midiHandler = function(bytes){
        var hex, status, target, hexvalue, value, select;
        hex = midi.bytesToHex(bytes);
        status = hex[0].substr(0,1);
        target = hex[1] || "";
        hexvalue = hex[2] || "";
        value = bytes[2];
        if( status == "b"){
            //RPN Handler
            if( target == "63" ){
                _rpnCheck = 1;
                _rpnMSB = hexvalue;
                return;
            }else
            if( target == "62" && _rpnCheck == 1){
                _rpnCheck = 2;
                _rpnLSB = hexvalue;
                return;
            }else
            if( target == "06" && _rpnCheck == 2){
                _rpnCheck = 0;
                self.updateBySelector('*[midi-msb="'+_rpnMSB+'"][midi-lsb="' +_rpnLSB +'"][midi-cc="63"]',value)
                return
            }
            self.updateBySelector('*[midi-cc="'+target+'"]',value);
        }
    }

    this.toMidi = function(el,value){
        var hexValue;
        hexValue = midi.intToHex(value);
        if(el.hasAttribute('midi-sys')){
            var target = el.getAttribute('midi-sys');
            midi.outHex(['f'+target, hexValue]);
            return;
        }
        if(!el.hasAttribute('midi-cc')){
            return;
        }
        var cc = el.getAttribute('midi-cc');
        if(cc == "63"){
            var msb = el.getAttribute('midi-msb');
            var lsb = el.getAttribute('midi-lsb');
            midi.outHex(["b",cc,msb]);
            midi.outHex(["b","62",lsb]);
            midi.outHex(["b","06",hexValue]);
        }else{
            midi.outHex(["b",cc,hexValue]);
        }
    }

    var inputEvents = {
        "mouseDown" : {
            "slider--x"         :   self.handleSliderDown,
            "slider--y"         :   self.handleSliderDown,
            "button--step"      :   self.handleButtonStepDown,
            "button"            :   self.handleButtonOnOffDown,
            "knob"              :   self.handleKnobDown,
            "key"               :   self.handleKeyDown,
        },
        "mouseUp" : {
            "key"               :   self.handleKeyUp,
            "knob"              :   self.handleKnobUp
        },
        "doubleClick" : {
            "slider--x"         :   self.handleSliderDoubleClick,
            "slider--y"         :   self.handleSliderDoubleClick
        },
        "mouseMove"  : {
            "slider--x"         :   self.handleSliderMouseMove,
            "slider--y"         :   self.handleSliderMouseMove,
            "knob"              :   self.handleKnobMove
        },
        "change" : {
            "select"            :   self.handleSelectChange,
            "input"             :   self.handleInputChange
        }
    }

    return this;
}).call(new Object());;
