// Building a mini ReactJS from scratch

import { v4 } from 'uuid'

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
  id: string
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
      id: v4(),
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
function createTextElement(text: string): VDOMNode {
  return {
    type: TEXT_ELEMENT, // This is a custom type, needed for text elements
    id: v4(),
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

let oldVDOM: VDOMNode | null = null // needed for diffing

function initialRender(vdom: VDOMNode, container: HTMLElement | null) {
  if (!container) return

  if (typeof vdom.type === 'function') {
    const renderedVDOM = vdom.type(vdom.props)
    initialRender(renderedVDOM, container)
  } else {
    if (vdom.type === TEXT_ELEMENT) {
      const newTextElement = document.createTextNode(vdom.props.nodeValue)
      container.appendChild(newTextElement)
      return
    }

    const newElement = document.createElement(vdom.type)
    newElement.dataset.id = vdom.id
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

      const isStyleAttribute = key === 'style' && typeof props[key] === 'object'

      if (isStyleAttribute) {
        const styleString = Object.entries(props[key])
          .map(([prop, value]) => `${prop}: ${value}`)
          .join('; ')

        newElement.setAttribute('style', styleString)

        return
      }

      newElement.setAttribute(key, props[key])
    })

    container.appendChild(newElement)

    children.forEach((child) => {
      initialRender(child, newElement)
    })
  }

  oldVDOM = vdom
}

const START_ID = v4()

let states: Record<string, unknown> = {
  [START_ID]: null,
}

type StateFunction<State> = (prevState: State) => State

function useState<InitialState>(
  initialState: InitialState
): readonly [
  InitialState,
  (newState: InitialState | StateFunction<InitialState>) => void
] {
  // Needed so that we do not access wrong state.
  // This is a closure pattern in JavaScript. Closures remember the environment in which they were created.
  const FROZEN_KEY = states[START_ID] ? v4() : START_ID

  states[FROZEN_KEY] = (states[FROZEN_KEY] as InitialState) || initialState

  const setState = (newState: InitialState | StateFunction<InitialState>) => {
    const isCallback = typeof newState === 'function'

    if (isCallback) {
      const callback = newState as StateFunction<InitialState>
      states[FROZEN_KEY] = callback(states[FROZEN_KEY] as InitialState)
    } else {
      states[FROZEN_KEY] = newState
    }

    rerender() // If we do not rerender, the state will be updated but the UI will not
  }

  return [states[FROZEN_KEY] as InitialState, setState] as const
}

function getNewVDOM() {
  return <App />
}

function App() {
  const [count, setCount] = useState(0)

  const handleClick = () => {
    // directly mutating the state
    setCount(count + 1)

    // using callback
    // setCount((prevCount) => prevCount + 1)
  }

  // const listOfStrings = ['foo', 'bar', 'baz']

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={handleClick}>Click Me</button>
      {/* <ul>
        {listOfStrings.map((string) => (
          <li key={string}>{string}</li>
        ))}
      </ul> */}
    </div>
  )
}

type Change =
  | {
      vdom: VDOMNode
      type: 'REPLACE_NODE_WHERE_ID_CHANGED'
      oldNodeId: string
    }
  | {
      vdom: VDOMNode
      type: 'NEW_NODE_ADDED'
      parentId: string
    }
  | {
      vdom: VDOMNode
      type: 'REPLACE_TEXT'
      oldNodeId: string
    }
  | {
      vdom: VDOMNode
      type: 'DELETE_OLD'
    }
  | {
      vdom: VDOMNode
      type: 'REPLACE_NODE'
    }

function compareNode(oldNode: VDOMNode, newNode: VDOMNode): Change[] {
  // if id is different, it means that the node is different
  if (oldNode.id !== newNode.id) {
    // the reason we have old node id is because we need to know the id to replace in the real DOM that's based on the old VDOM
    return [
      {
        vdom: newNode,
        type: 'REPLACE_NODE_WHERE_ID_CHANGED',
        oldNodeId: oldNode.id,
      },
    ]
  }

  if (oldNode.type !== newNode.type) {
    return [{ vdom: newNode, type: 'REPLACE_NODE' }]
  }

  if (oldNode.type === TEXT_ELEMENT && newNode.type === TEXT_ELEMENT) {
    if (oldNode.props.nodeValue !== newNode.props.nodeValue) {
      // For TEXT_ELEMENT, we don't have an id, but we can use the parent's id.
      return [{ vdom: newNode, type: 'REPLACE_TEXT', oldNodeId: oldNode.id }]
    }
    return []
  }

  const oldNodeProps = oldNode.props
  const newNodeProps = newNode.props

  const oldNodePropsKeys = Object.keys(oldNodeProps)
  const newNodePropsKeys = Object.keys(newNodeProps)

  // 3. Compare the props of the oldNode and the newNode.
  for (
    let i = 0;
    i < oldNodePropsKeys.length || i < newNodePropsKeys.length;
    i++
  ) {
    const oldNodePropKey = oldNodePropsKeys[i]
    const newNodePropKey = newNodePropsKeys[i]

    if (!oldNodePropKey) {
      // If there is no old prop, it means that a new prop was added.
      return [{ vdom: newNode, type: 'REPLACE_NODE' }]
    } else if (!newNodePropKey) {
      // If there is no new prop, it means that an old prop was removed.
      return [{ vdom: oldNode, type: 'REPLACE_NODE' }]
    } else {
      // If there is an old and a new prop, compare them.
      const oldNodePropValue = oldNodeProps[oldNodePropKey]
      const newNodePropValue = newNodeProps[newNodePropKey]

      if (oldNodePropValue !== newNodePropValue) {
        return [{ vdom: newNode, type: 'REPLACE_NODE' }]
      }
    }
  }

  return []
}

function walkChildren(
  oldChildren: VDOMNode[],
  newChildren: VDOMNode[],
  parentId: string
): Change[] {
  // 1. Initialize an array to store changes in children.
  let changes: Change[] = []
  // 2. Iterate over oldChildren and newChildren (consider cases where they might be of different lengths).

  // loop but with parentId

  for (let i = 0; i < oldChildren.length || i < newChildren.length; i++) {
    const oldChild = oldChildren[i]
    const newChild = newChildren[i]

    if (!oldChild) {
      // If there is no old child, it means that a new child was added.
      // We need parentId to know where to insert the new child in the real DOM
      changes = [
        ...changes,
        { vdom: newChild, type: 'NEW_NODE_ADDED', parentId },
      ]
    } else if (!newChild) {
      // If there is no new child, it means that an old child was removed.
      changes = [...changes, { vdom: oldChild, type: 'DELETE_OLD' }]
    } else {
      // If there is an old and a new child, call 'walk' to compare them. They are both VDOMNodes.
      changes = [...changes, ...walk(oldChild, newChild)]
    }
  }

  return changes
}

function walk(oldVDOM: VDOMNode, newVDOM: VDOMNode): Change[] {
  // 1. Initialize an array to store changes between oldVDOM and newVDOM.
  let changes: Change[] = []
  // 2. Use 'compareNode' to compare the oldVDOM and newVDOM nodes themselves.
  changes = [...changes, ...compareNode(oldVDOM, newVDOM)]
  // 2.a. Add any changes identified by 'compareNode' to the changes array.
  // 3. If both oldVDOM and newVDOM have children, use 'walkChildren' to compare their children.

  if (!oldVDOM.props.children || !newVDOM.props.children) {
    return changes
  }

  changes = [
    ...changes,
    ...walkChildren(oldVDOM.props.children, newVDOM.props.children, oldVDOM.id),
  ]
  // 3.a. Add any changes identified by 'walkChildren' to the changes array.
  // 4. Return the array of changes.
  return changes
}

function diff(oldVDOM: VDOMNode, newVDOM: VDOMNode): Change[] {
  return walk(oldVDOM, newVDOM)
}

function applyChangesToRealDOM(changes: Change[]) {
  changes.forEach((change) => {
    if (change.type === 'REPLACE_TEXT') {
      const dataId = change.oldNodeId

      // 1. Create a new text node using the new VDOM node's nodeValue.
      const newTextElement = document.createTextNode(
        change.vdom.props.nodeValue
      )

      // 2. Get the parent DOM element with dataId, since we know it is set on data-id attribute.
      const parentElement = document.querySelector(`[data-id="${dataId}"]`)

      // 3. Replace the old text node with the new text node in the parent element
      if (!parentElement) return

      parentElement.replaceChild(
        newTextElement,
        parentElement.firstChild as HTMLElement
      )
    }

    if (change.type === 'REPLACE_NODE') {
      // Here we know the ID is the same, it's all about replacing with the same data id
      // 1. Create a new DOM element using the new VDOM node.
      // 2. Get the DOM element with data-id.
      // 3. Replace the old DOM element with the new DOM element.
      createRealDOMElementWithVDOM({
        vdom: change.vdom,
        mutateDomCallback: (newElement) => {
          const element = document.querySelector(
            `[data-id="${change.vdom.id}"]`
          )
          element?.replaceWith(newElement)
        },
      })
    }

    if (change.type === 'REPLACE_NODE_WHERE_ID_CHANGED') {
      // 1. Get the DOM element with oldNodeId to know its position
      // 2. Create a new DOM element using the new VDOM node.
      // 3. Replace the old DOM element with the new DOM element.
      const element = document.querySelector(`[data-id="${change.oldNodeId}"]`)

      createRealDOMElementWithVDOM({
        vdom: change.vdom,
        mutateDomCallback: (newElement) => {
          element?.replaceWith(newElement)
        },
      })
    }

    if (change.type === 'NEW_NODE_ADDED') {
      // 1. Get parent element with parentId
      const parentElement = document.querySelector(
        `[data-id="${change.parentId}"]`
      )
      // 2. Create a new DOM element using the new VDOM node.
      // 3. Append the new DOM element to the parent element.
      createRealDOMElementWithVDOM({
        vdom: change.vdom,
        mutateDomCallback: (newElement) => {
          parentElement?.appendChild(newElement)
        },
      })
    }

    if (change.type === 'DELETE_OLD') {
      // 1. Get the DOM element with vdom.id.
      const element = document.querySelector(`[data-id="${change.vdom.id}"]`)

      // 2. Remove the DOM element entirely.
      if (!element) return
      element.remove()
    }
  })
}

const rerender = () => {
  if (!oldVDOM) return // skip the first render

  const newVDOM = getNewVDOM()
  const changes = diff(oldVDOM, newVDOM)
  applyChangesToRealDOM(changes)
  oldVDOM = newVDOM // Update the reference to the new VDOM
}

initialRender(<App />, document.querySelector('#app'))
