import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardStatCard from '../shared/DashboardStatCard'
import { FaUser } from 'react-icons/fa'

describe('DashboardStatCard', () => {
 const defaultProps = {
 icon: FaUser,
 title: 'Total Patients',
 value: 42,
 color: 'bg-blue-500',
 }

 it('renders without crashing', () => {
 render(<DashboardStatCard {...defaultProps} />)
 expect(screen.getByText('Total Patients')).toBeInTheDocument()
 })

 it('displays the title', () => {
 render(<DashboardStatCard {...defaultProps} />)
 expect(screen.getByText('Total Patients')).toBeInTheDocument()
 })

 it('displays a numeric value', () => {
 render(<DashboardStatCard {...defaultProps} value={42} />)
 expect(screen.getByText('42')).toBeInTheDocument()
 })

 it('displays a string value', () => {
 render(<DashboardStatCard {...defaultProps} value="$1,200" />)
 expect(screen.getByText('$1,200')).toBeInTheDocument()
 })

 it('displays subtitle when provided', () => {
 render(<DashboardStatCard {...defaultProps} subtitle="Active this month" />)
 expect(screen.getByText('Active this month')).toBeInTheDocument()
 })

 it('does not render subtitle when not provided', () => {
 render(<DashboardStatCard {...defaultProps} />)
 expect(screen.queryByText('Active this month')).not.toBeInTheDocument()
 })

 it('displays positive trend', () => {
 render(<DashboardStatCard {...defaultProps} trend={12} />)
 expect(screen.getByText('+12% from last month')).toBeInTheDocument()
 })

 it('displays negative trend', () => {
 render(<DashboardStatCard {...defaultProps} trend={-5} />)
 expect(screen.getByText('-5% from last month')).toBeInTheDocument()
 })

 it('displays zero trend as positive', () => {
 render(<DashboardStatCard {...defaultProps} trend={0} />)
 expect(screen.getByText('+0% from last month')).toBeInTheDocument()
 })

 it('does not render trend when not provided', () => {
 render(<DashboardStatCard {...defaultProps} />)
 expect(screen.queryByText(/from last month/)).not.toBeInTheDocument()
 })

 it('applies positive trend styling (green)', () => {
 render(<DashboardStatCard {...defaultProps} trend={10} />)
 const trendElement = screen.getByText('+10% from last month')
 expect(trendElement.className).toContain('text-green-600')
 })

 it('applies negative trend styling (red)', () => {
 render(<DashboardStatCard {...defaultProps} trend={-3} />)
 const trendElement = screen.getByText('-3% from last month')
 expect(trendElement.className).toContain('text-red-600')
 })
})
