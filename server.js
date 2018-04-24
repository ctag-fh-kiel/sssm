const ipcMain = require('electron').ipcMain;


function server(mainWindow){

    var express = require('express');
    var app = express();
    var server = app.listen(3000);
    var io = require('socket.io').listen(5000,{path:'/'})
    var apps = {};
    var app_clients = {};
    
    var midi_usb;
    var midi_array = [];
    var midi_msb;
    var midi_lsb;
    var midi_buf;
    var midi_step;
    var midi_input = [];
    var midi_output = [];

    
    io.on('connection', function (socket) {

      socket.on('clientReady', function(){
          if("drumkit" in apps){
              socket.emit("init", apps.drumkit );
          }
      })

      socket.on('update', function(data){
          io.sockets.emit('update',data);
          mainWindow.webContents.send("update",data);
      });

      socket.on('midi',function(data){
          saveMidi(data);
          //socket.broadcast.emit('midi',data);
          mainWindow.webContents.send("midi",data);
      });

      socket.on('refresh',function(channel){
          let data =  getMidi(channel);
          socket.emit('refresh',data);
      })

      socket.on('sequence_split', function(data){
            mainWindow.webContents.send("sequence_split",data);
      })

      socket.on('sequence_add', function(data){
          mainWindow.webContents.send("sequence_add",data);
      })

      socket.on('sequence_remove', function(data){
        mainWindow.webContents.send("sequence_remove",data);
     })

      socket.on('sequencer_init', function(data){
        mainWindow.webContents.send("sequencer_init",data);
      })
    });

    app.use(express.static('client'));

    ipcMain.on('ready', function(event, data) {
        apps[data.id] = data;
        mainWindow.webContents.send('refresh', getMidi());
    });

    ipcMain.on('refresh', function(event,data){
        mainWindow.webContents.send('refresh', getMidi());
    })

    ipcMain.on('midi', function(event,data){
        io.sockets.emit('midi',data);
    })

    ipcMain.on('reset', function(){
        midi_array = [];
    })

    ipcMain.on('sequence_split', function(event,data){       
        io.sockets.emit('sequence_split', data);
    })

    ipcMain.on('sequence_remove', function(event,data){
        io.sockets.emit('sequence_remove', data);
    })

    ipcMain.on('sequence_add', function(event,data){
        io.sockets.emit('sequence_add', data);
    })

    ipcMain.on('sequencer_init', function(event, data){
        io.sockets.emit('sequencer_init', data);
    })


    function intToHex(int,fill){
        fill = fill || false;
        var num = int.toString(16);
        if (!fill) {
            if(num.length < 2){
                num = '0'+num;
            }
        }
        return num;
    }

    
    this.bytesToHex = function(bytes){
        var out, hex;
        hex = bytes.map(function(b){return midi.intToHex(b)});
        out = [];
        status = hex[0].substr(0,1);
        out.push(status);
        if(bytes[0] >= 240){
            out.push(hex[0].substr(0,1));            
            out.push(hex[0].substr(1,1));
            out.concat(hex.slice(1));
        }else{
            out.push(hex[0].substr(0,1));
            out.concat(hex.slice(1));
        }
        return out 
    }

    function saveMidi(bytes){
        var hex, status, target, hexvalue;
        if(bytes[0] >= 240) return false;
        status = parseInt(bytes[0]/16);
        channel = bytes[0] % 16;
        target = bytes[1];
        value = bytes.slice(2).reduce((a,b)=>a+b,0);
        if(status == 8 || status == 9) return false;
        if(midi_array[channel] === undefined){
            midi_array[channel] = [];
        }
        midi_buf = midi_array[channel];

        if(midi_buf[status] === undefined){
            midi_buf[status] = [];
        }
        midi_buf = midi_buf[status];

        if(target == 99){
            midi_msb = value;
            return;
        }
        if(target == 98){
            midi_lsb = value;
            return;
        }
        if(target == 6){
            if(midi_buf[99] === undefined) midi_buf[99] = [];
            midi_buf = midi_buf[99];
            if(midi_buf[midi_msb] === undefined) midi_buf[midi_msb] = [];
            midi_buf = midi_buf[midi_msb];
            midi_buf[midi_lsb] = value;
            return;
        }
        midi_buf[target] = value;
    }

    function getMidi(){
        var output = [];
        var midi_string = "";
        midi_array.forEach(function(channelV, channel){
            channelV.forEach(function(statusV, status){
                var st = status * 16;
                statusV.forEach(function(targetV, target){
                    if(target == 99){       
                        targetV.forEach(function(msbV, msb){
                            msbV.forEach(function(value, lsb){
                                output.push([st+channel, 99, msb]);
                                output.push([st+channel, 98, lsb]);
                                output.push([st+channel , 6, value]);
                            });
                        })
                        return true;
                    }
                    output.push([st+channel, target, targetV]);
                });
            });
        });
        return output;
    }
}

module.exports = server;
