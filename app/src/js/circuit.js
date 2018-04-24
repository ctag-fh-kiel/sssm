/* This module creates the application interface to controll the midi connectors.
Its a canvas object using KonvaJs*/

function SSSMCircuit() {

}

SSSMCircuit.prototype = (function () {
    var self, _count, _nodes, _fontSize, _padding, _capture, _paths;
    var _stage, _nodeLayer, _curveLayer, _colors, _outDrag, _statusColors, splitNode;;

    self = this;
    this.init = function (container) {
        _container = container;
        _stage = new Konva.Stage({
            container: _container,
            width: window.innerWidth,
            height: window.innerHeight
        })
        _nodeLayer = new Konva.Layer();
        _curveLayer = new Konva.Layer();
        _fontSize = 15;
        _colors = ['#ffaaee', '#eeaaff', '#eeeeaa', '#aaeeaa', '#aaaaee', '#eeaaaa', '#ee33aa', '#eeaa33', '#33eeaa', '#ffaaee', '#ffeeaa', '#aaeeff', '#aaeeaa', '#aaaaee', '#eeaaaa', '#ee33aa', '#eeaa33', '#33eeaa'];
        _statusColors = {
            default: '#eee',
            pending: '#FFFF00',
            active: '#00FF00'
        }
        _count = 0;
        _capture = false;
        _outDrag = false;
        _nodes = [];
        _paths = [];
        _stage.add(_nodeLayer);
        _stage.add(_curveLayer);
        _nodeLayer.on('beforeDraw', function () {
            self.drawLines();
        })


        _nodeLayer.draw();
        _count++;

        return this;
    }


    this.addMergeNode = function () {
        var mergeNode;
        mergeNode = new MergeNode(this, _count, '#cccccc').init();
        _nodes.push(mergeNode);
        _nodeLayer.add(mergeNode.group);
        _nodeLayer.draw();
        return mergeNode;
    };



    this.addSplitNode = function () {
        var splitNode;
        splitNode = new SplitNode(this, _count, '#cccccc').init();
        _nodes.push(splitNode);
        _nodeLayer.add(splitNode.group);
        _nodeLayer.draw();
        return splitNode;
    };


    this.addMidiNode = function (midi) {
        var node, group, text, rec_main, rec_in, rec_out, rec_through;
        var color = _colors[_count] || '#eeeeee';
        node = new MidiNode(this, _count, color, midi).init();
        _nodes.push(node);
        _nodeLayer.add(node.group);
        _nodeLayer.draw();
        _count++;
        return node;
    }

    /* 
    When a node gets clicked we first check for pending status. 
    If there is a first node selected, we then connect them unless they are the same,
    Otherwise the clicked node is now a pending node waiting for a connection.
    */
    this.nodeClick = function (o) {
        var type, current, path, ab, missing;
        current = o.target || false;
        if (!current) return false;

        type = o.target.type || false;

        if (!_capture) {
            _capture = o.target;
            _capture.setStatus("pending")
            _stage.draw();
            return true;
        }

        if (_capture == current || current.node == _capture.node) {
            var path;
            path = _capture.path;
            self.disconnect(_capture);
            _capture = false;
            return true;
        }

        if (!self.connectNodes(current, _capture)) {
            self.disconnect(_capture);
        }
        _capture = false;
    }


    /* node a and b both save their current path. 
    On disconnection the path referral on each path is unset and its status set to default */
    this.disconnect = function (c) {
        var a, b, path, type;
        path = c.path || false;

        c.setStatus('default');
        if (!path) return false;
        a = path.start;
        b = path.end;

        a.disconnect();

        a.setStatus('default');
        b.setStatus('default');
        self.destroyPath(path);

    }

    /* Connect two nodes if at least one of them has an Input oder Through Node selected and the other is Output */
    this.connectNodes = function (_a, _b) {
        var a, b, missing, ab;
        ab = [_a, _b];
        missing = ['through', 'in', 'out'].find(o => ab.indexOf(o) == -1);
        a = ab.find(o => o.type != "in");
        b = ab.find(o => o.type == "in");
        if (a == undefined || b == undefined || missing == "in") return false;

        if (a.path) self.disconnect(a);
        if (b.path) self.disconnect(b);

        a.connect(b.input);

        path = new Konva.Line({
            stroke: '#000',
            strokeWidth: 1
        });

        path.start = a;
        path.end = b;

        a.path = path;
        a.setStatus('active');

        b.path = path;
        b.setStatus('active');

        _nodeLayer.add(path);
        _paths.push(path);
        self.drawLines();
        _stage.draw();
        return true;
    }

    /* Update function to redraw every path */
    this.drawLines = function () {
        _paths.forEach(function (path) {
            var start, end, from, to;
            from = path.start;
            to = path.end;
            start = from.getAbsolutePosition();
            start.x += from.width() / 2;
            start.y += from.height() / 2;

            end = to.getAbsolutePosition();
            end.x += to.width() / 2;
            end.y += to.height() / 2;
            path.points([start.x, start.y, end.x, end.y]);
        })
        _curveLayer.draw();
    }

    /* Set Path's Nodes to default state and unset the referral */
    this.destroyPath = function (path) {
        path.start.setStatus('default');
        path.start.path = false;
        path.end.setStatus('default');
        path.end.path = false;
        path.destroy();
        _stage.draw();
    }

    Object.defineProperty(this, "stage", {
        get: function () {
            return _stage
        }
    });
    Object.defineProperty(this, "statusColors", {
        get: function () {
            return _statusColors
        }
    });

    return this;
}).call(new Object());


/* THe Midi node extends the Konva Rectangle Object th set status, 
path and midi function to be called when a connection is established*/
function MidiNode(_circuit, _count, _color, _midi) {
    var self = this;
    var circuit, id, x, y, name, fill, midi;
    var group, text, rec_main, rec_in, rec_out, rec_through;

    circuit = _circuit;
    id = _count;
    x = 40;
    y = _count * 50;
    fill = _color;
    midi = _midi;
    name = midi.name;
    padding = 5;

    this.init = function () {

        group = new Konva.Group({
            draggable: true,
            x: x,
            y: y
        });

        text = new Konva.Text({
            x: 0 + padding,
            y: padding,
            text: name
        })

        rec_main = new Konva.Rect({
            x: 0,
            y: 0,
            width: text.width() + padding * 2,
            height: text.height() + padding * 2,
            fill: fill,
        });


        rec_in = new Konva.Rect({
            x: 0 - rec_main.height(),
            y: 0,
            width: rec_main.height(),
            height: rec_main.height(),
            fill: '#eee'
        })

        rec_in.on('mouseenter', this.recEnter.bind(this));
        rec_in.on('mouseleave', this.recLeave.bind(this));
        rec_in.on('click', circuit.nodeClick);
        rec_in.node = this;
        rec_in.type = "in";
        rec_in.input = this.midi.in;
        rec_in.setStatus = this.setStatus;
        rec_in.setStatus('default');

        rec_out = new Konva.Rect({
            x: rec_main.width(),
            y: 0,
            width: rec_main.height(),
            height: rec_main.height(),
            fill: '#eee'
        })
        rec_out.on('mouseenter', this.recEnter.bind(this));
        rec_out.on('mouseleave', this.recLeave.bind(this));
        rec_out.on('click', circuit.nodeClick);
        rec_out.node = this;
        rec_out.connect = this.midi.connect.out;
        rec_out.disconnect = this.midi.disconnect.out;
        rec_out.type = "out";
        rec_out.setStatus = this.setStatus;
        rec_out.setStatus('default');


        rec_through = new Konva.Rect({
            x: 0,
            y: 0 + (rec_main.height() + window.innerHeight) % window.innerHeight,
            width: rec_main.height(),
            height: rec_main.height(),
            fill: '#eee'
        })
        rec_through.on('mouseenter', this.recEnter.bind(this));
        rec_through.on('mouseleave', this.recLeave.bind(this));
        rec_through.on('click', circuit.nodeClick);
        rec_through.node = this;
        rec_through.type = "through";
        rec_through.connect = this.midi.connect.through;
        rec_through.disconnect = this.midi.disconnect.through;
        rec_through.setStatus = this.setStatus;
        rec_through.setStatus('default');

        group.add(rec_main);
        group.add(text);
        group.add(rec_in);
        group.add(rec_out)
        group.add(rec_through)

        return this;
    }

    this.recEnter = function (o) {
        circuit.stage.container().style.cursor = "pointer";
        circuit.stage.draw();
    }

    this.recLeave = function (o) {
        circuit.stage.container().style.cursor = "default";
        circuit.stage.draw();
    }

    this.setStatus = function (status) {
        this.status = status;
        this.fill(circuit.statusColors[this.status]);
    }


    Object.defineProperty(this, "group", {
        get: function () {
            return group
        }
    });
    Object.defineProperty(this, "id", {
        get: function () {
            return id
        }
    });
    Object.defineProperty(this, "midi", {
        get: function () {
            return midi
        }
    });
    Object.defineProperty(this, "name", {
        get: function () {
            return name
        }
    });
    Object.defineProperty(this, "in", {
        get: function () {
            return rec_in
        }
    });
    Object.defineProperty(this, "out", {
        get: function () {
            return rec_out
        }
    });
    Object.defineProperty(this, "through", {
        get: function () {
            return rec_through
        }
    });

    return this;
}

function MergeNode(_circuit, _count, _color) {
    var self = this;
    var circuit, id, x, y, name, fill;
    var group, text, rec_main, rec_ins, rec_out, rec_through;

    circuit = _circuit;
    id = _count;
    x = 0;
    y = _count * 20;
    fill = _color;
    name = "MERGE";
    padding = 5;
    rec_ins = [];

    this.init = function () {

        group = new Konva.Group({
            draggable: true,
            y: y,
            x: 100
        });

        text = new Konva.Text({
            x: 0 + padding,
            y: padding,
            text: name
        })

        rec_main = new Konva.Rect({
            x: 0,
            y: 0,
            width: text.width() + padding * 2,
            height: 0 + (text.height() + padding * 2 + window.innerHeight) % window.innerHeight,
            fill: fill,
        });
        group.add(rec_main);

        for (let i = -2; i < 3; i++) {
            rec_in = new Konva.Rect({
                x: 0 - rec_main.height(),
                y: i * rec_main.height(),
                width: rec_main.height(),
                height: rec_main.height(),
                fill: '#eee'
            })

            rec_in.on('mouseenter', this.recEnter.bind(this));
            rec_in.on('mouseleave', this.recLeave.bind(this));
            rec_in.on('click', circuit.nodeClick);
            rec_in.node = this;
            rec_in.type = "in";
            rec_in.input = this.output;
            rec_in.setStatus = this.setStatus;
            rec_in.setStatus('default');
            rec_ins.push(rec_in);
            group.add(rec_in);

        }

        rec_out = new Konva.Rect({
            x: rec_main.width(),
            y: 0,
            width: rec_main.height(),
            height: rec_main.height(),
            fill: '#eee'
        })

        rec_out.on('mouseenter', this.recEnter.bind(this));
        rec_out.on('mouseleave', this.recLeave.bind(this));
        rec_out.on('click', circuit.nodeClick);
        rec_out.node = this;
        rec_out.connect = function (x) {
            this.connected = x
        };
        rec_out.connected = false;
        rec_out.disconnect = function () {
            this.connected = false
        };
        rec_out.type = "out";
        rec_out.setStatus = this.setStatus;
        rec_out.setStatus('default');
        group.add(rec_out);


        group.add(text);
        this.group = group;

        this.in = rec_ins;
        this.out = rec_out;

        return this;
    }

    this.output = function (data) {
        if (rec_out.connected) {
            rec_out.connected(data);
        }
    }

    this.recEnter = function (o) {
        circuit.stage.container().style.cursor = "pointer";
        circuit.stage.draw();
    }

    this.recLeave = function (o) {
        circuit.stage.container().style.cursor = "default";
        circuit.stage.draw();
    }

    this.setStatus = function (status) {
        this.status = status;
        this.fill(circuit.statusColors[this.status]);
    }


    this.id = id;
    this.name = name;

    return this;
}


function SplitNode(_circuit, _count, _color) {
    var self = this;
    var circuit, id, x, y, name, fill;
    var group, text, rec_main, rec_ins, rec_through, rec_outs;

    circuit = _circuit;
    id = _count;
    x = 100;
    y = _count * 20;
    fill = _color;
    name = "SPLIT";
    padding = 5;
    rec_outs = [];

    this.init = function () {

        group = new Konva.Group({
            draggable: true,
            y: y,
            x: x
        });

        text = new Konva.Text({
            x: padding,
            y: padding,
            text: name
        })

        rec_main = new Konva.Rect({
            x: 0,
            y: 0,
            width: text.width() + padding * 2,
            height: 0 + (text.height() + padding * 2 + window.innerHeight) % window.innerHeight,
            fill: fill,
        });
        group.add(rec_main);

        rec_in = new Konva.Rect({
            x: 0 - rec_main.height(),
            y: 0,
            width: rec_main.height(),
            height: rec_main.height(),
            fill: '#eee'
        })

        rec_in.on('mouseenter', this.recEnter.bind(this));
        rec_in.on('mouseleave', this.recLeave.bind(this));
        rec_in.on('click', circuit.nodeClick);
        rec_in.node = this;
        rec_in.type = "in";
        rec_in.input = this.output;
        rec_in.setStatus = this.setStatus;
        rec_in.setStatus('default');
        group.add(rec_in);


        for (let i = -2; i < 3; i++) {
            var rec_out = new Konva.Rect({
                x: rec_main.width(),
                y: i * rec_main.height(),
                width: rec_main.height(),
                height: rec_main.height(),
                fill: '#eee'
            })
            rec_out.id = i + 2;

            rec_out.on('mouseenter', this.recEnter.bind(this));
            rec_out.on('mouseleave', this.recLeave.bind(this));
            rec_out.on('click', circuit.nodeClick);
            rec_out.node = this;
            rec_out.connect = function (x) {
                this.connected = x
            };
            rec_out.connected = false;
            rec_out.disconnect = function () {
                this.connected = false
            };
            rec_out.type = "out";
            rec_out.setStatus = this.setStatus;
            rec_out.setStatus('default');
            rec_outs.push(rec_out);
            group.add(rec_out);
        }

        group.add(text);
        this.group = group;
        this.in = rec_in;
        this.out = rec_outs;
        return this;
    }

    this.output = function (data) {
        rec_outs.forEach(r => {
            if (r.connected) {
                r.connected(data);
            }
        })
    }

    this.recEnter = function (o) {
        circuit.stage.container().style.cursor = "pointer";
        circuit.stage.draw();
    }

    this.recLeave = function (o) {
        circuit.stage.container().style.cursor = "default";
        circuit.stage.draw();
    }

    this.setStatus = function (status) {
        this.status = status;
        this.fill(circuit.statusColors[this.status]);
    }

    this.id = id;
    this.name = name;
    return this;
}