import { xnew } from '../core/xnew';

export function File(
    data: string,
    filename: string,
    mimeType: string = 'text/plain'
): void {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}