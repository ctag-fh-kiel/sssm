var portscanner = require('portscanner');
var Netmask = require('netmask').Netmask;
var os = require('os');

function check(receiver, port) {
    var ifaces = os.networkInterfaces();
    let ips = [];
    receiver.send("info", "Suche Kamera");
    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }
            var block = new Netmask(iface.address, iface.netmask);
            block.forEach(ip=> {
                if (true || ip != iface.address) {
                    ips.push(ip);
                }
            });
        });

    });
    let toCheck = ips.map(ip=>new Promise((resolve)=> {
        portscanner.checkPortStatus(port, ip, function (error, status) {
            status == "open" ? resolve(ip) : resolve(null);
        });
    }));

    Promise.all(toCheck)
        .then((ips)=>ips.filter(ip=>ip != null), (error)=>console.error(error))
        .then(ips=> {
            if (ips.length != 0) {
                var hostname = ips[0]+':' + port;
                receiver.send("netscan_serverFound", {ip: ips[0], host:hostname, url: 'http://'+hostname});
            } else {
                console.log("No IP Found. Retry in 5 Seconds.");
                receiver.send("netscan_serverNotFound", "Nichts gefunden");
                setTimeout(()=>check(receiver), 5000);
            }
        });
    return true;
};
module.exports = check;