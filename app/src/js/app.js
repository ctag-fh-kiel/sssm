var app;
window.onload = function(){
    app = new SSSM();
    app.init(SSSMDrumkit,SSSMSynth,SSSMMidiIo,SSSMSequencer,SSSMClock, SSSMCircuit);
}

function SSSM(){
};


//Main Application 

SSSM.prototype = (function(){
    var drumkit, synths, sequencers, clock;
    var webMidis, webMidi, midiWebMidi;
    var instruments;
    var ipc;
    var self;
    var circuit;
    var splitNodeA, splitNodeB, mergeNode;
    

    // Load all Modules and Instruments

    this.init = function(Drumkit,Synth,Midi,Sequencer,Clock, Circuit){
        ipc = require("electron").ipcRenderer;
        instruments = [];
        synths= [];
        sequencers = [];
        webMidis = [];
        self = this;
        var canvasEl = document.getElementById('circuit'); 
        circuit  = new Circuit(this).init(canvasEl);
        
        
        /* get webmidi devices with a little delay (sometimes they arent found at the start) */
        setTimeout(
            function(){navigator.requestMIDIAccess({sysex:true}).then( onMIDISuccess, onMIDIFailure )},
            1000
        )

        /* */
        function onMIDISuccess( midiAccess ) {
            listInputsAndOutputs(midiAccess);
            midiAccess.inputs.forEach(function(input, key){
                let instrument = {};
                let output = false;
                let outputs = midiAccess.outputs.forEach(out=>{
                    if(out.name == input.name) output = out;
                });
                if(output == undefined) return false;

                let midi = new Midi(output.name);
                midi.init();
                let node = circuit.addMidiNode(midi);
                midi.connect.in(function(bytes){
                    output.send(bytes);
                })

                /* Bind WebMidi message to Midi-Controller output */
                input.onmidimessage = function(e){
                    var dv;
                    var set = []
                    e.data.forEach((o)=>set.push(parseInt(o)));
                    midi.output(set); 
                };
                //circuit.connectNodes(node.out, mergeNodeA.in[4]);
                instruments.push({name:'webMidi', midi:midi, node:node});
                webMidis.push(midi);
            })
        
        }

        function onMIDIFailure(msg) {
            console.log( "Failed to get MIDI access - " + msg );
        }

        function listInputsAndOutputs( midiAccess ) {
            for (var entry of midiAccess.inputs) {
                var input = entry[1];
                console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
                "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
                "' version:'" + input.version + "'" );
            }

            for (var entry of midiAccess.outputs) {
                var output = entry[1];
                console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
                "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
                "' version:'" + output.version + "'" );
            }
        }



        //INIT SYNTHESIZER
        /* Three Synthesizers listening to port 2,3 and 4*/

        for(var i=1; i<4; i++){
            var nodeSynth, midiSynth, synth;
            synth = new Synth();
            midiSynth = new Midi("Synthesizer "+i);
            midiSynth.init(i);
            nodeSynth = circuit.addMidiNode(midiSynth);
            synth.init(midiSynth);
            midiSynth.connect.in(synth.midiHandler.bind(synth));
            synths.push({instrument:synth, midi:midiSynth});
            instruments.push({name:'synth'+i, instrument:synth, midi:midiSynth, node:nodeSynth});
        }


        //INIT SEQUENCERs
        /* Three Sequencers listening to port 2,3 and 4*/
        for(var i=1; i<4; i++){
            var sequencer
            sequencer = new Sequencer();
            var midiSequencer = new Midi("Sequencer "+i);
            var nodeSequencer; 
            midiSequencer.init(i);
            sequencer.init(midiSequencer, ipc);
            nodeSequencer = circuit.addMidiNode(midiSequencer);
            midiSequencer.connect.in(sequencer.midiHandler.bind(sequencer));
            instruments.push({name:'sequencer'+i, instrument:sequencer, midi:midiSequencer, node:nodeSequencer});
            sequencer.send = function(message, data){
                ipc.send(message,data);
            }
            sequencers.push({instrument: sequencer, midi:midiSequencer});
        }

       
        //INIT CLOCK 
        /* Listening on midi port 16 but there isnt really a channel specific message used anyway */
        var nodeClock
        midiClock = new Midi("Clock");
        midiClock.init(15);
        clock = new Clock(midiClock);
        midiClock.connect.in(clock.midiHandler.bind(clock));
        nodeClock = circuit.addMidiNode(midiClock);
        instruments.push({name:'clock', instrument:clock,  midi:midiClock, node:nodeClock});
        


        //INIT DRUMKIT
        /* Listening on midi port 16 */
        var midiDrumkit, nodeDrumkit;
        
        midiDrumkit = new Midi("Drumkit");
        midiDrumkit.init(15);
        drumkit = new Drumkit(midiDrumkit);
        midiDrumkit.connect.in(drumkit.midiHandler.bind(drumkit));
        nodeDrumkit = circuit.addMidiNode(midiDrumkit);
        instruments.push({name:'drumkit', instrument:drumkit,  midi:midiDrumkit, node:nodeDrumkit});
        
        document.body.addEventListener("click",function(event){
            var el = event.target;
            var action =el.getAttribute("data-action");
            if(action in self){
                self[action]();
            }
        });


        //INIT IPC Midi
        /* No default channel so all signals pass through */
        var midiIpc;
        var nodeIpc;
        midiIpc = new Midi("IPC");
        midiIpc.init();
        midiIpc.connect.in(function(data){
            ipc.send('midi', data);
        })
        nodeIpc = circuit.addMidiNode(midiIpc);

        instruments.push({name:'ipc', midi:midiIpc, node:nodeIpc});

        ipc.on('refresh', function(event, set){
            set.forEach(function(data){
                midiIpc.out(data);
            })
        })


        //MIDI Handling
        ipc.on('midi', function(event,data){
            midiIpc.out(data);
        })
        

        /* Set the default midi connection scheme */

        nodes = {};
        mergeNodeA = circuit.addMergeNode();
        mergeNodeB = circuit.addMergeNode();
        
        splitNodeA = circuit.addSplitNode();
        splitNodeB = circuit.addSplitNode();
        

        instruments.forEach(i => nodes[i.name] = i.node);


        circuit.connectNodes(nodes["ipc"].out, nodes['clock'].in);
        circuit.connectNodes(nodes["clock"].out, mergeNodeA.in[0]);
        circuit.connectNodes(nodes["clock"].through, mergeNodeA.in[1]);
        circuit.connectNodes(mergeNodeA.out, splitNodeA.in);
        
        circuit.connectNodes(splitNodeA.out[0], nodes["drumkit"].in);
        circuit.connectNodes(splitNodeA.out[1], nodes["sequencer1"].in);
        circuit.connectNodes(nodes["sequencer1"].through, nodes["sequencer2"].in);
        circuit.connectNodes(nodes["sequencer2"].through, nodes["sequencer3"].in);
        
        circuit.connectNodes(nodes["sequencer1"].out, mergeNodeB.in[0]);
        circuit.connectNodes(nodes["sequencer2"].out, mergeNodeB.in[1]);
        circuit.connectNodes(nodes["sequencer3"].out, mergeNodeB.in[2]);
        
        circuit.connectNodes(splitNodeA.out[2], mergeNodeB.in[4]);       
        circuit.connectNodes(mergeNodeB.out, splitNodeB.in );       
        circuit.connectNodes(splitNodeB.out[0],  nodes["synth1"].in);
        circuit.connectNodes(nodes["synth1"].through, nodes["synth2"].in);
        circuit.connectNodes(nodes["synth2"].through, nodes["synth3"].in);
        circuit.connectNodes(splitNodeB.out[1],  nodes["ipc"].in);
        

        /* 
        Netscan functionality,
        if other application found, add midiNode and tunnel events
        */ 
        ipc.on('netscan_serverFound', function(event, data){
            console.log('server gefunden');
            console.log(data);
            var _io = io(data.url)
            var ioMidi = new Midi("IO");
            ioMidi.init();
            ioMidi.connect.in(function(data){
                _io.emit('midi', data)
            });
            var nodeIo = circuit.addMidiNode(ioMidi);
            _io.on('midi', function(data){
                ioMidi.out(data);
            })
        });

        ipc.on('netscan_serverNotFound', function(event, data){
            console.log('nix gefunden');
        });

        this.refresh();
    }


    /* Button Events */


    this.refresh = function(){
        ipc.send("refresh");
    }

    this.addSplitNode = function(){
        circuit.addSplitNode();
    }

    this.addMergeNode = function(){
        circuit.addMergeNode();
    }
    this.resetMidiLog = function(){
        ipc.send("reset");
    }

    this.clockMode = function(){
        clock.switchMode();
    }

    this.startServer = function(){
        ipc.send('start_server');
        ipc.send('ready', drumkit.getData());
    }

    this.findServer = function(){
        ipc.send('find_server');
    }

    Object.defineProperty(this,"synth",{get: function(){return synths} });
    Object.defineProperty(this,"drumkit",{get: function(){return drumkit} });
    Object.defineProperty(this,"sequencers",{get: function(){return sequencers} });
    Object.defineProperty(this,"instruments",{get: function(){return instruments} });
    Object.defineProperty(this,"webMidi",{get: function(){return webMidi} });

    return this;

}).call(new Object());
