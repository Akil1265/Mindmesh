import { render, screen, fireEvent } from '@testing-library/react'
import FormatSelector from '../FormatSelector'
import { describe, it, expect } from 'vitest'
import React from 'react'

describe('FormatSelector', () => {
  it('renders checkboxes and toggles selection', () => {
    const TestHarness = () => {
      const [selected, setSelected] = React.useState(['pdf'])
      return <FormatSelector selected={selected} onChange={setSelected} />
    }
    render(<TestHarness />)
    const pdf = screen.getByLabelText(/pdf/i)
    const docx = screen.getByLabelText(/docx/i)
    expect(pdf).toBeChecked()
    expect(docx).not.toBeChecked()
    fireEvent.click(docx)
    expect(docx).toBeChecked()
  })
})
