import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return marked.parse(value, { async: false }) as string;
  }
}
