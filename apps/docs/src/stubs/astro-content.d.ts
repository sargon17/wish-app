declare module 'astro:content' {
	export const z: typeof z;
	export namespace z {
		interface Schema {
			safeParse(...args: any[]): any;
			safeParseAsync(...args: any[]): Promise<any>;
		}
		type infer<T> = any;
		type input<T> = any;
		type output<T> = any;
		type SafeParseReturnType<Input, Output> = any;
		type ZodErrorMap = any;
	}
	export type SchemaContext = any;
	export type CollectionEntry<T = any> = any;
	export type RenderResult = any;
	export type DataCollectionKey = any;

	export function defineCollection(config: unknown): unknown;
	export function getCollection(...args: any[]): Promise<any[]>;
}

declare module '*.jsonc?raw' {
	const content: string;

	export default content;
}
