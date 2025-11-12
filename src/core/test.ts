

// 関数オーバーロードの型定義
interface TestFunction {
    (aaa: string, bbb: number): void;
    (aaa: string): void;
    print(text: string): void;
}

export const test: TestFunction = Object.assign(
    function(aaa: string, bbb?: number) {
        console.log('test');
    },
    {
        print(text: string) {
            console.log(text);
        }
    }
)