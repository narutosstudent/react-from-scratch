// Building a mini ReactJS from scratch

const REACT_OWN_ATTRIBUTES = {
  className: 'className',
  htmlFor: 'htmlFor',
} as const

const RESERVED_JAVASCRIPT_ATTRIBUTES = {
  className: 'class',
  htmlFor: 'for',
} as const

const TEXT_ELEMENT = 'TEXT_ELEMENT'

interface VDOMNode {
  type: string | Function
  props: {
    [key: string]: any
    children: VDOMNode[]
  }
}

let React = {
  createElement: (type: any, props: any, ...children: any): VDOMNode => {
    // e.g. looks like this: React.createElement('h1', { title: 'foo' }, 'Hello World')
    // Nested e.g. looks like this: React.createElement('h1', { title: 'foo' }, 'Hello World', React.createElement('h2', null, 'Hello World'))
    return {
      type,
      props: {
        ...props,
        children: children.map((child: any) => {
          return typeof child === 'object' ? child : createTextElement(child)
        }),
      },
    }
  },
}

// e.g. looks like this: React.createElement('h1', { title: 'foo' }, 'Hello World')
// title would be props, title on HTML would be attributes
function createTextElement(text: string) {
  return {
    type: TEXT_ELEMENT, // This is a custom type, needed for text elements
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

function render(vdom: VDOMNode, container: HTMLElement | null): void {
  if (!container) return

  if (typeof vdom.type === 'function') {
    const renderedVDOM = vdom.type(vdom.props)
    render(renderedVDOM, container)
  } else {
    if (vdom.type === TEXT_ELEMENT) {
      const newElement = document.createTextNode(vdom.props.nodeValue)
      container.appendChild(newElement)
      return
    }

    const newElement = document.createElement(vdom.type)
    const { children, ...props } = vdom.props
    Object.keys(props).forEach((key) => {
      if (key === REACT_OWN_ATTRIBUTES.className) {
        newElement.setAttribute(
          RESERVED_JAVASCRIPT_ATTRIBUTES[REACT_OWN_ATTRIBUTES.className],
          props[key]
        )
      }

      if (key === REACT_OWN_ATTRIBUTES.htmlFor) {
        newElement.setAttribute(
          RESERVED_JAVASCRIPT_ATTRIBUTES[REACT_OWN_ATTRIBUTES.htmlFor],
          props[key]
        )
      }

      newElement.setAttribute(key, props[key])
    })

    container.appendChild(newElement)

    children.forEach((child) => {})
  }
}

function App() {
  return <h1>Hello World</h1>
}

render(<App />, document.getElementById('app'))
