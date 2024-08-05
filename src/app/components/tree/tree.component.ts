import { Component, Injectable } from '@angular/core'; // Import Component and Injectable decorators from Angular core
import { BehaviorSubject } from 'rxjs'; // Import BehaviorSubject for managing and emitting data state
import { HttpClient } from '@angular/common/http'; // Import HttpClient for making HTTP requests
import { FlatTreeControl } from '@angular/cdk/tree'; // Import FlatTreeControl to manage tree structure with flat nodes
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree'; // Import Angular Material tree modules
import { MatButtonModule } from '@angular/material/button'; // Import Angular Material button module
import { MatIconModule } from '@angular/material/icon'; // Import Angular Material icon module
import { MatFormFieldModule } from '@angular/material/form-field'; // Import Angular Material form field module
import { MatInputModule } from '@angular/material/input'; // Import Angular Material input module
import { CdkTreeModule } from '@angular/cdk/tree'; // Import CDK tree module for additional tree functionalities
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import Angular forms modules for handling forms
import { SelectionModel } from '@angular/cdk/collections'; // Import SelectionModel for managing selected nodes
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule to handle HTTP requests
import { CommonModule } from '@angular/common'; // Import CommonModule for common Angular directives and pipes

// Class representing a node in the tree
export class TodoItemNode {
  children: TodoItemNode[] = []; // Array of child nodes
  item: string = ''; // Node item name
}

// Class representing a flattened node in the tree
export class TodoItemFlatNode {
  item: string = ''; // Node item name
  level: number = 0; // Level of the node in the tree
  expandable: boolean = false; // Whether the node can be expanded
}

// Service class for managing tree data
@Injectable()
export class ChecklistDatabase {
  private apiUrl = 'http://localhost:1337/api/tree/get'; // API URL to fetch tree node data
  dataChange = new BehaviorSubject<TodoItemNode[]>([]); // BehaviorSubject to hold and emit tree data

  constructor(private http: HttpClient) {
    this.initialize(); // Fetch initial data on service construction
  }

  // Getter for tree data
  get data(): TodoItemNode[] {
    return this.dataChange.value; // Return current value of the data
  }

  // Initialize tree data by making an HTTP request
  initialize() {
    this.http.get<any>(this.apiUrl).subscribe(
      (response: any) => {
        try {
          const data = this.mapNodes(response); // Map response data to TodoItemNode structure
          this.dataChange.next(data); // Update BehaviorSubject with the new data
        } catch (error) {
          console.error('Error processing data:', error); // Log error if data processing fails
          this.dataChange.next([]); // Reset data to empty array on error
        }
      },
      error => {
        console.error('Error fetching data:', error); // Log error if HTTP request fails
        this.dataChange.next([]); // Reset data to empty array on error
      }
    );
  }

  // Map API response nodes to TodoItemNode structure
  mapNodes(nodes: any[]): TodoItemNode[] {
    const convertToTodoItemNode = (node: any): TodoItemNode => {
      const todoItemNode = new TodoItemNode(); // Create a new TodoItemNode instance
      todoItemNode.item = node.node; // Set node item name
      todoItemNode.children = (node.children || []).map(convertToTodoItemNode); // Recursively convert children
      return todoItemNode; // Return the converted node
    };

    return nodes.map(convertToTodoItemNode); // Convert all nodes in the response
  }
}

/**
 * @title Tree with checkboxes
 * Component for displaying and interacting with a tree structure
 */
@Component({
  selector: 'app-tree', // Component selector
  templateUrl: 'tree.component.html', // URL to the component template
  styleUrls: ['tree.component.scss'], // URL to the component styles
  providers: [ChecklistDatabase], // Provide ChecklistDatabase service to this component
  standalone: true, // Mark as standalone component
  imports: [
    FormsModule, // Import FormsModule for template-driven forms
    MatButtonModule, // Import MatButtonModule for Angular Material buttons
    MatTreeModule, // Import MatTreeModule for Angular Material tree
    MatIconModule, // Import MatIconModule for Angular Material icons
    MatFormFieldModule, // Import MatFormFieldModule for form fields
    MatInputModule, // Import MatInputModule for input fields
    CdkTreeModule, // Import CdkTreeModule for CDK tree functionalities
    ReactiveFormsModule, // Import ReactiveFormsModule for reactive forms
    CommonModule, // Import CommonModule for common directives and pipes
    HttpClientModule // Import HttpClientModule for HTTP requests
  ], // List of imported modules
})
export class TreeComponent {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>(); // Map to track relationship between flat and nested nodes
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>(); // Map to track relationship between nested and flat nodes
  selectedParent: TodoItemFlatNode | null = null; // Currently selected parent node
  newItemName = ''; // Name for new item
  treeControl: FlatTreeControl<TodoItemFlatNode>; // Control for managing the flat tree structure
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>; // Flattener to convert nested nodes to flat nodes
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>; // Data source for the tree
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */); // Selection model for managing selected nodes
  editingNode: TodoItemFlatNode | null = null; // Node currently being edited

  constructor(private _database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer, // Function to transform nested nodes to flat nodes
      this.getLevel, // Function to get the level of a node
      this.isExpandable, // Function to check if a node is expandable
      this.getChildren, // Function to get the children of a node
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable); // Initialize tree control
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener); // Initialize data source

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data; // Update data source when database data changes
    });
  }

  // Get the level of a flat node
  getLevel = (node: TodoItemFlatNode) => node.level;

  // Check if a flat node is expandable
  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  // Get the children of a nested node
  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  // Check if a node has a child
  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  // Check if a node has no content
  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  // Function to transform a nested node to a flat node
  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node); // Check if the node is already flattened
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode(); // Use existing node or create a new one
    flatNode.item = node.item; // Set item name
    flatNode.level = level; // Set node level
    flatNode.expandable = !!node.children?.length; // Set expandable property
    this.flatNodeMap.set(flatNode, node); // Map flat node to nested node
    this.nestedNodeMap.set(node, flatNode); // Map nested node to flat node
    return flatNode; // Return the flat node
  };

  // Toggle the visibility of the input field for editing a node
  showInputField(node: TodoItemFlatNode) {
    this.editingNode = this.editingNode === node ? null : node; // Set editing node to null if same node is clicked
  }

  // Save changes to a node
  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node); // Get the nested node corresponding to the flat node
    if (nestedNode) {
      // Placeholder for saving logic, e.g., updating the database
      // this._database.updateItem(nestedNode, itemValue);
      this.editingNode = null; // Clear editing node after saving
    }
  }

  // Get the parent node of the given node
  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node); // Get the level of the current node
    if (currentLevel < 1) {
      return null; // Return null if the node is at the root level
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1; // Start search from the node's previous position

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i]; // Get the current node in the iteration
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode; // Return the node if it is at a higher level
      }
    }
    return null; // Return null if no parent node is found
  }
}
