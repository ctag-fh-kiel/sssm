
/* The midi controller attached to every instrument */

function SSSMMidiIo(name){
    var self = this;
    this.channel = 0;
    this.id = parseInt(Date.now() * Math.random());
    this.name = name || "Midi Controller";
    this.connectIn = false;
    this.connectOut = false;
    this.connectThrough = false;
    
    this.init = function(channel, hex){
        this.channel = channel || false;
        this.hex = hex || false;
    };

    this.connect= {
        in : function(callback){
            self.connectIn = callback;
        },
        out: function(callback){
            self.connectOut = callback;
        },
        through: function(callback){
            self.connectThrough = callback;
        }
    }

    this.disconnect = {
        in : function(id){
            self.connectIn = false;
        },
        out: function(id){
            self.connectOut = false;            
        },
        through: function(id){
            self.connectThrough = false;            
        }
    }

    this.output = function(message){
        if(self.connectOut) self.connectOut(message);
    };

    this.input = function(message){
        if(self.connectIn) self.connectIn(message);
    };
    
    this.through = function(message){
        if(self.connectThrough) self.connectThrough(message);
    };



    /* Check for channel or system message (>=240) on incoming messages */
    this.in = function(bytes){
        self.through(bytes);
        if(bytes[0] <= 240){
            channel = bytes[0] % 16;
            if(self.channel !== false){
                if(self.channel !== channel) return false;
            }
        }
        out = bytes;
        self.input(out);
    }

    /* Add channel to midi signal on outgoing messages */
    this.out = function(orig){
        var bytes = orig.slice();
        if(bytes[0] < 240){
            if(self.channel !== false){
                bytes[0] = bytes[0] * 16;
                bytes[0] += self.channel;
            }
        }
        self.output(bytes);
    }

}

SSSMMidiIo.prototype = (function(){
    var self = this;
   

    this.intToHex = function(int,fill){
        fill = fill || true;
        var num = int.toString(16);
        if (fill) {
            if(num.length % 2 != 0){
                num = '0'+ num;
            }
        }
        return num;
    }

    this.hexToInt = function(hex){
        if(isNaN(parseInt(hex,16))) return false;
        return parseInt(hex,16);
    }

   
    this.outHex = function(hex){
        var bytes;
        bytes = this.hexToBytes(hex);
        this.out(bytes);
    }

   this.bytesToHex = function(bytes){
        var out, hex;
        hex = bytes.map(function(b){return self.intToHex(b)});
        out = [];
        if(bytes[0] >= 240){
            out.push(hex[0].substr(0,1));            
            out.push(hex[0].substr(1,1));
            out = out.concat(hex.slice(1));
            return out;
        }

        out = hex
        return out 
    }


    this.hexToBytes = function(hex){
        var out, bytes;
        bytes = hex.map(function(h){return self.hexToInt(h)});
        out = [];
        out = bytes;
        return out 
    }

    return this;

}).call(new Object);
