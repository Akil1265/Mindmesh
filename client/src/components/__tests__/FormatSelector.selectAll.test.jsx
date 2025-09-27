import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect } from 'vitest'
import FormatSelector, { EXPORT_FORMATS } from '../FormatSelector'

// Behavioral test for All/Clear toggle without relying on label text regex edge cases (parentheses)
describe('FormatSelector select all button', () => {
  it('toggles between select all and clear', () => {
    const Harness = () => {
      const [selected, setSelected] = React.useState([])
      return <FormatSelector selected={selected} onChange={setSelected} />
    }
    render(<Harness />)
    const button = screen.getByRole('button', { name: /all/i })
    // Click All -> all formats checked
    fireEvent.click(button)
    const checkboxesAfterAll = screen.getAllByRole('checkbox')
    expect(checkboxesAfterAll).toHaveLength(EXPORT_FORMATS.length)
    checkboxesAfterAll.forEach(cb => expect(cb).toBeChecked())
    expect(button).toHaveTextContent(/clear/i)
    // Click Clear -> none selected
    fireEvent.click(button)
    const checkboxesAfterClear = screen.getAllByRole('checkbox')
    checkboxesAfterClear.forEach(cb => expect(cb).not.toBeChecked())
    expect(button).toHaveTextContent(/all/i)
  })
})
