import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoginPage } from '../features/auth/LoginPage'
import { MemoryRouter } from 'react-router-dom'

describe('LoginPage', () => {
  it('renders the login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    expect(screen.getByAltText('ELEMENThaus')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ingresa tu usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ingresa tu contraseña')).toBeInTheDocument()
    expect(screen.getByText('INGRESAR')).toBeInTheDocument()
  })
})
