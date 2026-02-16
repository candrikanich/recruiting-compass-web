import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FormSelect from '~/components/DesignSystem/Form/FormSelect.vue';

describe('FormSelect', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  it('renders label and select correctly', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions
      }
    });

    const label = wrapper.find('label');
    expect(label.exists()).toBe(true);
    expect(label.text()).toContain('Test Label');

    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);
    expect(select.classes()).toContain('px-4');
    expect(select.classes()).toContain('py-3');
    expect(select.classes()).toContain('border-2');
    expect(select.classes()).toContain('border-slate-300');
    expect(select.classes()).toContain('rounded-xl');
  });

  it('renders all options with correct values', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions
      }
    });

    const select = wrapper.find('select');
    const options = select.findAll('option');

    expect(options).toHaveLength(3);
    expect(options[0].text()).toBe('Option 1');
    expect(options[0].element.value).toBe('option1');
    expect(options[1].text()).toBe('Option 2');
    expect(options[1].element.value).toBe('option2');
    expect(options[2].text()).toBe('Option 3');
    expect(options[2].element.value).toBe('option3');
  });

  it('shows required indicator when required is true', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions,
        required: true
      }
    });

    const label = wrapper.find('label');
    expect(label.text()).toContain('*');

    const srOnly = wrapper.find('.sr-only');
    expect(srOnly.exists()).toBe(true);
    expect(srOnly.text()).toContain('(required)');
  });

  it('displays error message and applies error styling', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions,
        error: 'This field has an error'
      },
      global: {
        stubs: {
          DesignSystemFieldError: {
            template: '<div data-testid="field-error">{{ error }}</div>',
            props: ['error', 'id']
          }
        }
      }
    });

    const select = wrapper.find('select');
    expect(select.classes()).toContain('border-red-500');
    expect(select.attributes('aria-invalid')).toBe('true');

    const errorMessage = wrapper.find('[data-testid="field-error"]');
    expect(errorMessage.exists()).toBe(true);
    expect(errorMessage.text()).toBe('This field has an error');
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions
      }
    });

    const select = wrapper.find('select');
    await select.setValue('option2');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['option2']);
  });

  it('disables select when disabled is true', () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions,
        disabled: true
      }
    });

    const select = wrapper.find('select');
    expect(select.attributes('disabled')).toBeDefined();
    expect(select.classes()).toContain('disabled:opacity-50');
    expect(select.classes()).toContain('disabled:cursor-not-allowed');
  });

  it('emits blur event when select loses focus', async () => {
    const wrapper = mount(FormSelect, {
      props: {
        modelValue: '',
        label: 'Test Label',
        options: defaultOptions
      }
    });

    const select = wrapper.find('select');
    await select.trigger('blur');

    expect(wrapper.emitted('blur')).toBeTruthy();
    expect(wrapper.emitted('blur')).toHaveLength(1);
  });
});
