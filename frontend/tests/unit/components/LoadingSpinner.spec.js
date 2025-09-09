import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

describe('LoadingSpinner.vue', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(LoadingSpinner)
    
    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
    expect(wrapper.find('.spinner').exists()).toBe(true)
    expect(wrapper.classes()).toContain('loading-spinner--medium')
  })
  
  it('renders with custom size', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        size: 'large'
      }
    })
    
    expect(wrapper.classes()).toContain('loading-spinner--large')
  })
  
  it('renders with custom color', () => {
    const color = '#ff0000'
    const wrapper = mount(LoadingSpinner, {
      props: {
        color
      }
    })
    
    const spinner = wrapper.find('.spinner')
    expect(spinner.attributes('style')).toContain(`border-top-color: ${color}`)
  })
  
  it('renders loading text when provided', () => {
    const text = '加载中...'
    const wrapper = mount(LoadingSpinner, {
      props: {
        text
      }
    })
    
    expect(wrapper.find('.loading-text').exists()).toBe(true)
    expect(wrapper.find('.loading-text').text()).toBe(text)
  })
  
  it('does not render loading text when not provided', () => {
    const wrapper = mount(LoadingSpinner)
    
    expect(wrapper.find('.loading-text').exists()).toBe(false)
  })
  
  it('renders overlay when overlay prop is true', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        overlay: true
      }
    })
    
    expect(wrapper.classes()).toContain('loading-spinner--overlay')
  })
  
  it('applies correct size classes', () => {
    const sizes = ['small', 'medium', 'large']
    
    sizes.forEach(size => {
      const wrapper = mount(LoadingSpinner, {
        props: { size }
      })
      
      expect(wrapper.classes()).toContain(`loading-spinner--${size}`)
    })
  })
  
  it('has correct accessibility attributes', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        text: '加载中...'
      }
    })
    
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('加载中...')
  })
  
  it('uses default aria-label when no text provided', () => {
    const wrapper = mount(LoadingSpinner)
    
    expect(wrapper.attributes('aria-label')).toBe('加载中')
  })
  
  it('matches snapshot', () => {
    const wrapper = mount(LoadingSpinner, {
      props: {
        size: 'large',
        color: '#3b82f6',
        text: '正在加载...',
        overlay: true
      }
    })
    
    expect(wrapper.html()).toMatchSnapshot()
  })
})