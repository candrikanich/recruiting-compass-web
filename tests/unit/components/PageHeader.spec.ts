import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PageHeader from '~/components/PageHeader.vue'

describe('PageHeader', () => {
  it('renders title as h1', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Test Title' },
    })
    const h1 = wrapper.find('h1')
    expect(h1.exists()).toBe(true)
    expect(h1.text()).toBe('Test Title')
    expect(h1.classes()).toContain('text-3xl')
    expect(h1.classes()).toContain('font-bold')
  })

  it('renders description when provided', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Title', description: 'Some description' },
    })
    const p = wrapper.find('p')
    expect(p.exists()).toBe(true)
    expect(p.text()).toBe('Some description')
  })

  it('does not render description paragraph when not provided', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Title' },
    })
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('renders actions slot content', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Title' },
      slots: { actions: '<button>Click me</button>' },
    })
    expect(wrapper.find('button').text()).toBe('Click me')
  })

  it('hides actions container when slot is empty', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Title' },
    })
    const header = wrapper.find('header')
    const innerDivs = header.findAll('div')
    const actionsDiv = innerDivs.filter(
      (d) =>
        d.classes().includes('flex') &&
        d.classes().includes('items-center') &&
        d.classes().includes('gap-3'),
    )
    expect(actionsDiv.length).toBe(0)
  })

  it('uses semantic header element with banner role', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Title' },
    })
    const header = wrapper.find('header')
    expect(header.exists()).toBe(true)
    expect(header.attributes('role')).toBe('banner')
  })

  it('has gradient background and border', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Title' },
    })
    const header = wrapper.find('header')
    expect(header.classes()).toContain('border-b')
    expect(header.classes()).toContain('border-slate-200')
  })
})
