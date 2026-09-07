import type { OcrLine,PixelRect,CellConfidence } from './image-concordance-extraction-core.mjs';
export const INCOMPLETE_TABLE_MESSAGE:string;
export type Field='antimicrobial'|'mic'|'category';
export interface CellPanel {id:string;left:number;right:number;top:number;bottom:number;slope:number;headerHeight:number;columns:Record<Field,{left:number;right:number}>}
export interface PhysicalRow {rowId:string;panelId:string;topY:number;bottomY:number;centerY:number;rect:PixelRect;cells:Record<Field,PixelRect>}
export interface InkMask {width:number;height:number;mask:Uint8Array;rules?:Uint8Array;threshold:number}
export function locateCellPanels(lines:readonly OcrLine[],region:PixelRect):CellPanel[];
export function createInkMask(image:{width:number;height:number;data:Uint8ClampedArray}):InkMask;
export function segmentPhysicalRows(ink:InkMask,panels:CellPanel[]):PhysicalRow[];
export function inspectCellInk(ink:InkMask,rect:PixelRect):{empty:boolean;rect:PixelRect;components:PixelRect[]};
export function cellConsensus(readings:{value:string;score:number}[],options?:{geometry?:boolean;allowHigh?:boolean}):{value:string;alternatives:string[];confidence:CellConfidence};
export function deduplicatePhysicalRows<T extends {rowId:string}>(rows:T[]):T[][];
export function operatorShape(ink:InkMask,rect:PixelRect):string;
