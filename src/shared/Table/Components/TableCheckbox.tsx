import { CheckboxInput } from '@rentnerkev/inputs/checkbox-input'
import { useTableCheckboxLogic } from '../Hooks/useTableCheckboxLogic.ts'
import type { TableCheckboxProps } from '../Types/dataTable.types.ts'

export function TableCheckbox({
    checked,
    indeterminate = false,
    disabled,
    label,
    onChange,
}: TableCheckboxProps) {
    const {
        refs: { input },
    } = useTableCheckboxLogic(indeterminate)
    return (
        <CheckboxInput
            ref={input}
            checked={checked}
            aria-checked={indeterminate ? 'mixed' : checked}
            aria-label={label}
            disabled={disabled}
            onChange={onChange}
            controlSize="sm"
        />
    )
}
