import { parse } from 'node-html-parser';
import { isValidUrl } from './url';

export function getTrackingImage(openTrackingPixel: string): string {
  return `<img src="${openTrackingPixel}" alt="" style="display: none; width: 1px; height: 1px;" />`;
}

export function getAllRawEmailLinks(html: string): Array<string> {
  const uniqueLinks = new Set<string>();

  const parsedHtml = parse(html);

  const links = parsedHtml.querySelectorAll('a') || [];
  for (const link of links) {
    const href = link.getAttribute('href');
    if ((href && !isValidUrl(href)) || !href) {
      continue;
    }

    uniqueLinks.add(href);
  }

  return Array.from(uniqueLinks);
}

export function processRawEmail(
  html: string,
  openTrackingPixel: string,
): string {
  return html + '\n' + getTrackingImage(openTrackingPixel);
}
