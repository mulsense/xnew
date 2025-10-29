export type AudioNodeMap = { [key: string]: AudioNode & { [key: string]: any } };

export class Audio {
    static context: AudioContext | null = null;
    static master: GainNode | null = null;

    static initialize() {
        if (typeof window !== 'undefined' && window instanceof Window) {
            Audio.context = new (window.AudioContext ?? (window as any).webkitAudioContext)();
            Audio.master = Audio.context.createGain();
            Audio.master.gain.value = 1.0;
            Audio.master.connect(Audio.context.destination);
        }
    }

    static connect(params: { [key: string]: any[] }): AudioNodeMap {
        if (!Audio.context) throw new Error("Audio context not initialized");
        const nodes: AudioNodeMap = {};
        Object.keys(params).forEach((key) => {
            const [type, props, ...to] = params[key];
            nodes[key] = (Audio.context as any)[`create${type}`]();
            Object.keys(props).forEach((name) => {
                if (nodes[key][name]?.value !== undefined) {
                    nodes[key][name].value = props[name];
                } else {
                    nodes[key][name] = props[name];
                }
            });
        });

        Object.keys(params).forEach((key) => {
            const [type, props, ...to] = params[key];

            to.forEach((to: string) => {
                let dest: any = null;
                if (to.indexOf('.') > 0) {
                    dest = nodes[to.split('.')[0]][to.split('.')[1]];
                } else if (nodes[to]) {
                    dest = nodes[to];
                } else if (to === 'master') {
                    dest = Audio.master;
                }
                nodes[key].connect(dest);
            });
        });
        return nodes;
    }
}

Audio.initialize();