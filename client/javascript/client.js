var socket = io('http://' + window.location.hostname + ':5000');
var sssm;

function SSSM(include){
    var apps,input,drumkit,synth,sequencer,midis;
    apps = {}
    midis = [];
    socket.emit('clientReady');

    socket.on('init', function (data) {
        var input = new SSSMInput();
        if(include.indexOf("drumkit") > -1){
            drumkit = new SSSMDrumkit();
            var midi = new SSSMMidiController();
            midi.init(15);
            input.init(midi);
            drumkit.init(midi,data);
            midi.connect.in(drumkit.midiHandler);
            midi.connect.in(input.midiHandler);
            midi.connect.out(function(message){
                socket.emit('midi', message);
            });
            midis.push(midi);
            apps.drumkit = {"app" : drumkit, "midi" : midi, "input" : input}
        }
        
        if(include.indexOf("sequencer") > -1){
            var midi = new SSSMMidiController();
            sequencer = new SSSMSequencer();
            midi.init(2);
            sequencer.init(midi, socket);
            
            midi.connect.in(sequencer.midiHandler.bind(sequencer));
            midi.connect.out(function(message){
                socket.emit('midi', message);
            })
            midis.push(midi);
            apps.sequencer = { 'app' : sequencer, 'midi' : midi};
        }

       

        if(include.indexOf("synth") > -1){
            var midi = new SSSMMidiController();
            synth = new SSSMSynth();
            midi.init(2);
            input.init(midi);
            synth.init(midi,data);
            midi.connect.in(synth.midiHandler.bind(synth));
            midi.connect.in(input.midiHandler.bind(input));
            midi.connect.out(function(message){
                socket.emit('midi',message);
                if("sequencer" in apps) 
                apps.sequencer.midi.in(message);
            });
            midis.push(midi);
            apps.synth = {"app" : synth, "midi" : midi, "input" : input}
        }
    });
   
    socket.emit('refresh');
    socket.on('midi',function(data){
        midis.forEach(function(midi){
            midi.in(data);
        });
    });

    socket.on('refresh',function(set){
        set.forEach(function(data){
            midis.forEach(function(midi){
                midi.in(data);
            });
        })
    })

    socket.on('sequence', x=> console.log('test'));

    Object.defineProperty(this,'apps', {get:function(){return apps}})
}
