import type { UmbStaticFileItemModel } from '../../repository/item/types.js';
import type { UmbInputStaticFileElement } from '../../components/index.js';
import type {
	UmbPropertyEditorUiElement,
	UmbPropertyEditorConfigCollection,
} from '@umbraco-cms/backoffice/property-editor';
import { customElement, html, property, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { UmbNumberRangeValueType } from '@umbraco-cms/backoffice/models';
import '../../components/input-static-file/index.js';
import { UmbServerFilePathUniqueSerializer } from '@umbraco-cms/backoffice/server-file-system';
import { UmbChangeEvent } from '@umbraco-cms/backoffice/event';

@customElement('umb-property-editor-ui-static-file-picker')
export class UmbPropertyEditorUIStaticFilePickerElement extends UmbLitElement implements UmbPropertyEditorUiElement {
	#singleItemMode = false;
	// TODO: get rid of UmbServerFilePathUniqueSerializer in v.15 [NL]
	#serverFilePathUniqueSerializer = new UmbServerFilePathUniqueSerializer();

	@state()
	private _value?: string | Array<string>;

	@state()
	private _allowedFileExtensions?: Array<string>;

	@state()
	private _disallowedFileExtensions?: Array<string>;

	@property({ attribute: false })
	public set value(value: string | Array<string> | undefined) {
		if (Array.isArray(value)) {
			this._value = value.map((unique) => this.#serverFilePathUniqueSerializer.toUnique(unique));
		} else if (value) {
			this._value = this.#serverFilePathUniqueSerializer.toUnique(value);
		} else {
			this._value = undefined;
		}
	}
	public get value(): string | Array<string> | undefined {
		if (Array.isArray(this._value)) {
			return this._value.map((unique) => this.#serverFilePathUniqueSerializer.toServerPath(unique) ?? '');
		} else if (this._value) {
			return this.#serverFilePathUniqueSerializer.toServerPath(this._value) ?? '';
		} else {
			return undefined;
		}
	}

	public set config(config: UmbPropertyEditorConfigCollection | undefined) {
		this.#singleItemMode = config?.getValueByAlias<boolean>('singleItemMode') ?? false;
		const validationLimit = config?.getValueByAlias<UmbNumberRangeValueType>('validationLimit');

		this._allowedFileExtensions = config?.getValueByAlias<Array<string>>('allowedFileExtensions');
		this._disallowedFileExtensions = config?.getValueByAlias<Array<string>>('disallowedFileExtensions');

		this._limitMin = validationLimit?.min ?? 0;
		this._limitMax = this.#singleItemMode ? 1 : (validationLimit?.max ?? Infinity);
	}

	@state()
	private _limitMin: number = 0;
	@state()
	private _limitMax: number = Infinity;

	#pickableFilter: (item: UmbStaticFileItemModel) => boolean = (item) => {
		const path = this.#serverFilePathUniqueSerializer.toServerPath(item.unique) ?? '';

		const hasExtensionFilters =
			(!!this._allowedFileExtensions && this._allowedFileExtensions.length > 0) ||
			(!!this._disallowedFileExtensions && this._disallowedFileExtensions.length > 0);

		// Folders should always be available for navigation/expansion in the tree,
		// but when file extension filters are applied we should not allow selecting folders as a value.
		if (item.isFolder) {
			return !hasExtensionFilters;
		}

		const lastDotIndex = path.lastIndexOf('.');
		const extension = lastDotIndex !== -1 ? path.substring(lastDotIndex).toLowerCase() : '';

		if (this._allowedFileExtensions && this._allowedFileExtensions.length > 0) {
			const normalizedAllowed = this._allowedFileExtensions.map((ext) => ext.toLowerCase());
			if (!extension || !normalizedAllowed.includes(extension)) {
				return false;
			}
		}

		if (this._disallowedFileExtensions && this._disallowedFileExtensions.length > 0) {
			const normalizedDisallowed = this._disallowedFileExtensions.map((ext) => ext.toLowerCase());
			if (extension && normalizedDisallowed.includes(extension)) {
				return false;
			}
		}

		return true;
	};

	private _onChange(event: CustomEvent) {
		if (this.#singleItemMode) {
			this._value = (event.target as UmbInputStaticFileElement).selection[0];
		} else {
			this._value = (event.target as UmbInputStaticFileElement).selection;
		}
		this.dispatchEvent(new UmbChangeEvent());
	}

	// TODO: Implement mandatory?
	override render() {
		return html`
			<umb-input-static-file
				.pickableFilter=${this._allowedFileExtensions || this._disallowedFileExtensions ? this.#pickableFilter : undefined}
				.selection=${this._value ? (Array.isArray(this._value) ? this._value : [this._value]) : []}
				.min=${this._limitMin ?? 0}
				.max=${this._limitMax ?? Infinity}
				@change=${this._onChange}></umb-input-static-file>
		`;
	}
}

export { UmbPropertyEditorUIStaticFilePickerElement as element };

export default UmbPropertyEditorUIStaticFilePickerElement;

declare global {
	interface HTMLElementTagNameMap {
		'umb-property-editor-ui-static-file-picker': UmbPropertyEditorUIStaticFilePickerElement;
	}
}
