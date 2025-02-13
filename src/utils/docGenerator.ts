import typescript from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { errorHandler, ErrorSeverity } from './errorHandler';
import { logger, LogLevel } from './logger';

export interface DocConfig {
	sourceDir: string;
	outputDir: string;
	excludePatterns?: string[];
}

export interface DocumentationEntry {
	name: string;
	kind: 'class' | 'interface' | 'function' | 'method' | 'property';
	description?: string;
	parameters?: Array<{
		name: string;
		type: string;
		description?: string;
		optional?: boolean;
	}>;
	returnType?: string;
	returnDescription?: string;
	examples?: string[];
}

export class DocumentationGenerator {
	private static instance: DocumentationGenerator;
	private program: typescript.Program;

	private constructor() {}

	public static getInstance(): DocumentationGenerator {
		if (!DocumentationGenerator.instance) {
			DocumentationGenerator.instance = new DocumentationGenerator();
		}
		return DocumentationGenerator.instance;
	}

	public generateDocumentation(config: DocConfig): void {
		try {
			this.program = typescript.createProgram(
				this.getSourceFiles(config.sourceDir, config.excludePatterns),
				{ target: typescript.ScriptTarget.ES2020, module: typescript.ModuleKind.CommonJS }
			);

			const sourceFiles = this.program.getSourceFiles();
			const documentation: Record<string, DocumentationEntry[]> = {};

			sourceFiles.forEach(sourceFile => {
				if (!sourceFile.isDeclarationFile) {
					const fileDocumentation = this.extractFileDocumentation(sourceFile);
					if (fileDocumentation.length > 0) {
						const fileName = path.basename(sourceFile.fileName, '.ts');
						documentation[fileName] = fileDocumentation;
					}
				}
			});

			this.writeDocumentationToMarkdown(config.outputDir, documentation);

			logger.log(LogLevel.INFO, 'Documentation generated', { 
				sourceDir: config.sourceDir, 
				outputDir: config.outputDir 
			});
		} catch (error) {
			errorHandler.log(
				error as Error, 
				ErrorSeverity.HIGH, 
				{ context: 'Documentation Generation' }
			);
		}
	}

	private getSourceFiles(
		sourceDir: string, 
		excludePatterns?: string[]
	): string[] {
		const files: string[] = [];
		
		const traverseDirectory = (dir: string) => {
			fs.readdirSync(dir).forEach(file => {
				const fullPath = path.join(dir, file);
				const relativePath = path.relative(sourceDir, fullPath);
				
				if (
					fs.statSync(fullPath).isDirectory() && 
					!this.isExcluded(relativePath, excludePatterns)
				) {
					traverseDirectory(fullPath);
				} else if (
					fullPath.endsWith('.ts') && 
					!fullPath.endsWith('.d.ts') && 
					!this.isExcluded(relativePath, excludePatterns)
				) {
					files.push(fullPath);
				}
			});
		};

		traverseDirectory(sourceDir);
		return files;
	}

	private isExcluded(
		path: string, 
		excludePatterns?: string[]
	): boolean {
		return excludePatterns 
			? excludePatterns.some(pattern => 
					new RegExp(pattern).test(path)
				)
			: false;
	}

	private extractFileDocumentation(
		sourceFile: typescript.SourceFile
	): DocumentationEntry[] {
		const documentation: DocumentationEntry[] = [];

		const visit = (node: ts.Node) => {
			if (typescript.isClassDeclaration(node) || 
					typescript.isInterfaceDeclaration(node) || 
					typescript.isFunctionDeclaration(node) ||
					typescript.isMethodDeclaration(node) ||
					typescript.isPropertyDeclaration(node)) {
				
				const symbol = node.name && this.getSymbol(node.name);
				const jsDoc = ts.getJSDocCommentRanges(node, node.getFullText());
				
				if (symbol && jsDoc && jsDoc.length > 0) {
					const entry = this.parseJSDoc(node, symbol, jsDoc[0]);
					if (entry) documentation.push(entry);
				}
			}

			ts.forEachChild(node, visit);
		};

		visit(sourceFile);
		return documentation;
	}

	private getSymbol(node: typescript.Node): typescript.Symbol | undefined {
		const checker = this.program.getTypeChecker();
		return checker.getSymbolAtLocation(node);
	}

	private parseJSDoc(
		node: typescript.Node, 
		symbol: typescript.Symbol, 
		commentRange: typescript.CommentRange
	): DocumentationEntry | undefined {
		const checker = this.program.getTypeChecker();
		const comment = node.getFullText().slice(
			commentRange.pos, 
			commentRange.end
		);

		// Basic JSDoc parsing logic
		const description = this.extractDescription(comment);
		const parameters = this.extractParameters(comment);
		const returnInfo = this.extractReturnInfo(comment);
		const examples = this.extractExamples(comment);

		let kind: DocumentationEntry['kind'];
		if (typescript.isClassDeclaration(node)) kind = 'class';
		else if (typescript.isInterfaceDeclaration(node)) kind = 'interface';
		else if (typescript.isFunctionDeclaration(node)) kind = 'function';
		else if (typescript.isMethodDeclaration(node)) kind = 'method';
		else if (typescript.isPropertyDeclaration(node)) kind = 'property';
		else return undefined;

		return {
			name: symbol.getName(),
			kind,
			description,
			parameters,
			returnType: this.getTypeString(node),
			returnDescription: returnInfo?.description,
			examples
		};
	}

	private extractDescription(comment: string): string | undefined {
		const descriptionMatch = comment.match(/\/\*\*\s*([^*]+)/);
		return descriptionMatch ? descriptionMatch[1].trim() : undefined;
	}

	private extractParameters(comment: string): DocumentationEntry['parameters'] {
		const paramRegex = /@param\s+{([^}]+)}\s+(\[)?(\w+)\]?\s*(.+)?/g;
		const parameters: DocumentationEntry['parameters'] = [];
		let match;

		while ((match = paramRegex.exec(comment)) !== null) {
			parameters.push({
				type: match[1],
				name: match[3],
				optional: !!match[2],
				description: match[4]?.trim()
			});
		}

		return parameters;
	}

	private extractReturnInfo(comment: string): { 
		description?: string 
	} | undefined {
		const returnMatch = comment.match(/@returns?\s+{([^}]+)}\s*(.+)?/);
		return returnMatch 
			? { 
					description: returnMatch[2]?.trim() 
				} 
			: undefined;
	}

	private extractExamples(comment: string): string[] {
		const exampleRegex = /@example\s*```typescript\n([\s\S]*?)```/g;
		const examples: string[] = [];
		let match;

		while ((match = exampleRegex.exec(comment)) !== null) {
			examples.push(match[1].trim());
		}

		return examples;
	}

	private getTypeString(node: ts.Node): string {
		const checker = this.program.getTypeChecker();
		const type = checker.getTypeAtLocation(node);
		return checker.typeToString(type);
	}

	private writeDocumentationToMarkdown(
		outputDir: string, 
		documentation: Record<string, DocumentationEntry[]>
	): void {
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		Object.entries(documentation).forEach(([fileName, entries]) => {
			const markdownContent = this.generateMarkdown(fileName, entries);
			const outputPath = path.join(outputDir, `${fileName}.md`);
			
			fs.writeFileSync(outputPath, markdownContent);
		});
	}

	private generateMarkdown(
		fileName: string, 
		entries: DocumentationEntry[]
	): string {
		let markdown = `# ${fileName} Documentation\n\n`;

		entries.forEach(entry => {
			markdown += `## ${entry.name}\n\n`;
			markdown += `**Kind**: ${entry.kind}\n\n`;
			
			if (entry.description) {
				markdown += `**Description**: ${entry.description}\n\n`;
			}

			if (entry.parameters && entry.parameters.length > 0) {
				markdown += "### Parameters\n\n";
				entry.parameters.forEach(param => {
					markdown += `- \`${param.name}\`: ${param.type}${param.optional ? ' (optional)' : ''}\n`;
					if (param.description) {
						markdown += `  - ${param.description}\n`;
					}
				});
				markdown += "\n";
			}

			if (entry.returnType) {
				markdown += `### Returns\n\n`;
				markdown += `\`${entry.returnType}\`\n`;
				if (entry.returnDescription) {
					markdown += `${entry.returnDescription}\n`;
				}
				markdown += "\n";
			}

			if (entry.examples && entry.examples.length > 0) {
				markdown += "### Examples\n\n";
				entry.examples.forEach(example => {
					markdown += "```typescript\n";
					markdown += `${example}\n`;
					markdown += "```\n\n";
				});
			}

			markdown += "---\n\n";
		});

		return markdown;
	}
}

export const docGenerator = DocumentationGenerator.getInstance();