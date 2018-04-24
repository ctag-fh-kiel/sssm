function SSSMMidiController(){
    var self = this;
    this.channel = 0;

    this.connectIn = [];
    this.connectOut = [];
    
    this.connect= {
        in : function(callback){
            self.connectIn.push(callback);
        },
        out: function(callback){
            self.connectOut.push(callback);
        }
    }

    this.output = function(message){
        for (var i = 0; i < self.connectOut.length; i++) {
            self.connectOut[i](message)
        }
    };

    this.input = function(message){
        for (var i = 0; i < self.connectIn.length; i++) {
            self.connectIn[i](message)
        }
    };
}

SSSMMidiController.prototype = (function(){
    var self = this;

    this.init = function(channel, hex){
        this.channel = (typeof channel == "number") ? channel : false;
        this.hex = hex || false;
    };

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

    this.in = function(bytes){
        if(bytes[0] <= 240){
            channel = bytes[0] % 16;
            if(this.channel !== false){
                if(this.channel != channel) return false;
            }
        }
        out = bytes;
        this.input(out);
    }

    this.out = function(data){
        var bytes = data.slice();
        if(bytes[0] < 240){
            if(this.channel !== false){
                bytes[0] = bytes[0] * 16;
                bytes[0] += this.channel;
            }
        }
        this.output(bytes);
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
        // if(bytes[0] < 240){
        //     out.push(bytes[0]);
        //     out = out.concat(bytes.slice(1));
        // }else{
        //     out.push(bytes[0]);
        //     out.concat(bytes.slice(1));
        // }
        return out 
    }

/*
    this.in = function(message){
        var status,channel,target,hexValue;
        message = message.toLowerCase();
        status = message.substr(0,1);
        if( status == "f" ){
            target = message.substr(1,1);
            hexValue = message.substr(2);
        }else{
            channel = message.substr(1,1);
            target = message.substr(2,2);
            hexValue = message.substr(4,2);           
            if(channel != this.channel){
                return;
            }
        }       
        this.input(status,target,hexValue);
    }

    this.out = function(status,target,hexValue){
        var system, message;
        channel = (status == "f") ? '' : this.intToHex(this.channel,true);
        message = status + channel + target + hexValue;
        message = message.toLowerCase();
        this.output(message);
    }
*/

    return this;

}).call(new Object);
