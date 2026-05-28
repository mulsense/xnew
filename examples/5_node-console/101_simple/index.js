import xnew from '../../dist/xnew.mjs';

xnew(Main);

function Main(unit) {
    let count = 0;
    xnew.interval(() => {
        count++;
        console.log(`tick ${count}`);
    }, 500);

    xnew.timeout(() => {
        console.log('done');
        unit.finalize();
        process.exit(0);
    }, 3000);
}
