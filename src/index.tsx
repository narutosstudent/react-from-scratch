// Building a mini ReactJS from scratch

let React = {
  createElement: (type: any, props: any, ...children: any) => {
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
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

function render(vdom: any, container: HTMLElement | null) {}

function App() {
  return <h1>Hello World</h1>
}

render(<App />, document.getElementById('app'))
