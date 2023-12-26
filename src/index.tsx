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
      const isEventAttribute = key.startsWith('on')

      if (isEventAttribute) {
        const eventName = key.substring(2).toLowerCase() // e.g. onClick -> click
        newElement.addEventListener(eventName, props[key])
        return
      }

      const isClassNameAttribute = key === REACT_OWN_ATTRIBUTES.className
      if (isClassNameAttribute) {
        newElement.setAttribute(
          RESERVED_JAVASCRIPT_ATTRIBUTES[REACT_OWN_ATTRIBUTES.className],
          props[key]
        )
      }

      const isHtmlForAttribute = key === REACT_OWN_ATTRIBUTES.htmlFor
      if (isHtmlForAttribute) {
        newElement.setAttribute(
          RESERVED_JAVASCRIPT_ATTRIBUTES[REACT_OWN_ATTRIBUTES.htmlFor],
          props[key]
        )
      }

      newElement.setAttribute(key, props[key])
    })

    container.appendChild(newElement)

    children.forEach((child) => {
      render(child, newElement)
    })
  }
}

let states: any[] = []
let stateIndex = 0

type StateFunction<State> = (prevState: State) => State

function useState<InitialState>(
  initialState: InitialState
): readonly [
  InitialState,
  (newState: InitialState | StateFunction<InitialState>) => void
] {
  // Needed so that we do not access wrong state.
  // This is a closure pattern in JavaScript. Closures remember the environment in which they were created.
  // Even though stateIndex changes, FROZEN_INDEX will always be the same.
  const FROZEN_INDEX = stateIndex

  states[FROZEN_INDEX] = (states[FROZEN_INDEX] as InitialState) || initialState

  const setState = (newState: InitialState | StateFunction<InitialState>) => {
    const isCallback = typeof newState === 'function'

    if (isCallback) {
      const callback = newState as StateFunction<InitialState>
      states[FROZEN_INDEX] = callback(states[FROZEN_INDEX])
    } else {
      states[FROZEN_INDEX] = newState
    }

    rerender() // If we do not rerender, the state will be updated but the UI will not
  }

  stateIndex++
  return [states[FROZEN_INDEX], setState] as const
}

function App() {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    // directly mutating the state
    setCount(count + 1)

    // using callback
    // setCount((prevCount) => prevCount + 1)
  }

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  )
}

render(<App />, document.getElementById('app'))

const rerender = () => {
  stateIndex = 0
  document.querySelector('#app')?.firstChild?.remove()
  render(<App />, document.querySelector('#app'))
}
