import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HealthTrackerTabs from '../HealthTrackerTabs'

// Mock all tab components to avoid complex rendering
vi.mock('../tabs/DashboardTab', () => ({
 default: ({ onNavigateToTab }: any) => <div data-testid="dashboard-tab">Dashboard Tab</div>,
}))
vi.mock('../tabs/FoodDiaryTab', () => ({
 default: () => <div data-testid="food-tab">Food Diary Tab</div>,
}))
vi.mock('../tabs/ExerciseTab', () => ({
 default: () => <div data-testid="exercise-tab">Exercise Tab</div>,
}))
vi.mock('../tabs/SleepTab', () => ({
 default: () => <div data-testid="sleep-tab">Sleep Tab</div>,
}))
vi.mock('../tabs/AiCoachTab', () => ({
 default: () => <div data-testid="ai-coach-tab">AI Coach Tab</div>,
}))
vi.mock('../tabs/ProgressTab', () => ({
 default: () => <div data-testid="progress-tab">Progress Tab</div>,
}))
vi.mock('../tabs/MealPlannerTab', () => ({
 default: () => <div data-testid="meal-plan-tab">Meal Planner Tab</div>,
}))
vi.mock('../tabs/ProfileGoalsTab', () => ({
 default: () => <div data-testid="profile-tab">Profile Goals Tab</div>,
}))
vi.mock('../BloodPressureScanner', () => ({
 default: () => <div data-testid="bp-tab">BP Check Tab</div>,
}))

describe('HealthTrackerTabs', () => {
 it('renders with dashboard tab by default', () => {
 render(<HealthTrackerTabs />)
 expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument()
 })

 it('switches to food diary tab on click', () => {
 render(<HealthTrackerTabs />)
 fireEvent.click(screen.getByText('Food Diary'))
 expect(screen.getByTestId('food-tab')).toBeInTheDocument()
 })

 it('renders all 8 tab buttons on desktop', () => {
 render(<HealthTrackerTabs />)
 expect(screen.getByText('Dashboard')).toBeInTheDocument()
 expect(screen.getByText('Food Diary')).toBeInTheDocument()
 expect(screen.getByText('Exercise')).toBeInTheDocument()
 expect(screen.getByText('Sleep')).toBeInTheDocument()
 expect(screen.getByText('AI Coach')).toBeInTheDocument()
 expect(screen.getByText('Progress')).toBeInTheDocument()
 expect(screen.getByText('Meal Plan')).toBeInTheDocument()
 expect(screen.getByText('BP Check')).toBeInTheDocument()
 })

 it('switches to exercise tab', () => {
 render(<HealthTrackerTabs />)
 fireEvent.click(screen.getByText('Exercise'))
 expect(screen.getByTestId('exercise-tab')).toBeInTheDocument()
 })

 it('switches to AI Coach tab', () => {
 render(<HealthTrackerTabs />)
 fireEvent.click(screen.getByText('AI Coach'))
 expect(screen.getByTestId('ai-coach-tab')).toBeInTheDocument()
 })

 it('switches to progress tab', () => {
 render(<HealthTrackerTabs />)
 fireEvent.click(screen.getByText('Progress'))
 expect(screen.getByTestId('progress-tab')).toBeInTheDocument()
 })

 it('switches to meal plan tab', () => {
 render(<HealthTrackerTabs />)
 fireEvent.click(screen.getByText('Meal Plan'))
 expect(screen.getByTestId('meal-plan-tab')).toBeInTheDocument()
 })

 it('switches to BP Check tab', () => {
 render(<HealthTrackerTabs />)
 fireEvent.click(screen.getByText('BP Check'))
 expect(screen.getByTestId('bp-tab')).toBeInTheDocument()
 })
})
