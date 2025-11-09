export const context: AudioContext = new AudioContext();
export const master: GainNode = context.createGain();
master.gain.value = 1.0;
master.connect(context.destination);

export class AudioNodeClass {
    nodes: { [key: string]: AudioNode & { [key: string]: any } };

    constructor(params: { [key: string]: any[] }) {
        if (!context) throw new Error("Audio context not initialized");
        this.nodes = {};
        Object.keys(params).forEach((key) => {
            const [type, props, ...to] = params[key];
            this.nodes[key] = (context as any)[type]();
            Object.keys(props).forEach((name) => {
                if (this.nodes[key][name]?.value !== undefined) {
                    this.nodes[key][name].value = props[name];
                } else {
                    this.nodes[key][name] = props[name];
                }
            });
        });

        Object.keys(params).forEach((key) => {
            const [type, props, ...to] = params[key];

            to.forEach((to: string) => {
                let dest: any = null;
                if (to.indexOf('.') > 0) {
                    dest = this.nodes[to.split('.')[0]][to.split('.')[1]];
                } else if (this.nodes[to]) {
                    dest = this.nodes[to];
                } else if (to === 'master') {
                    dest = master;
                }
                this.nodes[key].connect(dest);
            });
        });
    }

    cleanup() {
        Object.keys(this.nodes).forEach((key) => {
            this.nodes[key].disconnect();
        });
    }
}

export type AudioNodeMap = { [key: string]: AudioNode };
export function connect(params: { [key: string]: any[] }): AudioNodeMap {

    const nodes: AudioNodeMap = {};
    Object.keys(params).forEach((key) => {
        const [type, props, ...to] = params[key];
        nodes[key] = (context as any)[`create${type}`]() as AudioNode;
        const node = nodes[key] as { [key: string]: any };
        Object.keys(props).forEach((name) => {
            if (node[name]?.value !== undefined) {
                node[name].value = props[name];
            } else {
                node[name] = props[name];
            }
        });
    });

    Object.keys(params).forEach((key) => {
        const [type, props, ...to] = params[key];

        to.forEach((to: string) => {
            let dest: any = null;
            if (to.indexOf('.') > 0) {
                dest = (nodes[to.split('.')[0]] as { [key: string]: any })[to.split('.')[1]];
            } else if (nodes[to]) {
                dest = nodes[to];
            } else if (to === 'master') {
                dest = master;
            }
            nodes[key].connect(dest);
        });
    });
    return nodes;
}