import { Component, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs'; // Import BehaviorSubject for managing state
import { HttpClient } from '@angular/common/http'; // Import HttpClient for making HTTP requests
import { FlatTreeControl } from '@angular/cdk/tree'; // Import FlatTreeControl for managing the tree structure
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree'; // Import Angular Material tree modules
import { MatButtonModule } from '@angular/material/button'; // Import Angular Material button module
import { MatCheckboxModule } from '@angular/material/checkbox'; // Import Angular Material checkbox module
import { MatIconModule } from '@angular/material/icon'; // Import Angular Material icon module
import { MatFormFieldModule } from '@angular/material/form-field'; // Import Angular Material form field module
import { MatInputModule } from '@angular/material/input'; // Import Angular Material input module
import { CdkTreeModule } from '@angular/cdk/tree'; // Import CDK tree module
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule for handling forms
import { SelectionModel } from '@angular/cdk/collections'; // Import SelectionModel for managing selected nodes
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule for HTTP requests

/**
 * Node for to-do item
 */
export class TodoItemNode {
  children: TodoItemNode[]; // List of child nodes
  item: string; // Item name
}

export class TodoItemFlatNode {
  item: string; // Item name
  level: number; // Level in the tree
  expandable: boolean; // Whether the node can be expanded
}

/**
 * Service for managing checklist data
 */
@Injectable()
export class ChecklistDatabase {
  updateItem(nestedNode: TodoItemNode, itemValue: string) {
    throw new Error('Method not implemented.');
  }
  private apiUrl = 'http://localhost:1337/api/trees?populate=*'; // API URL to fetch node data
  dataChange = new BehaviorSubject<TodoItemNode[]>([]); // BehaviorSubject to manage data state

  constructor(private http: HttpClient) {
    this.initialize(); // Initialize data fetching
  }

  // Getter for data
  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  // Initialize data by fetching from API
  initialize() {
    this.http.get<any>(this.apiUrl).subscribe(
      (response: any) => {
        if (response && response.data) {
          try {
            const data = this.mapNodes(response.data); // Map API response to tree structure
            this.dataChange.next(data); // Update data state
          } catch (error) {
            console.error('Error processing data:', error); // Handle data processing errors
            this.dataChange.next([]); // Set empty data on error
          }
        } else {
          console.error('Unexpected response structure:', response); // Handle unexpected response structure
          this.dataChange.next([]); // Set empty data on error
        }
      },
      error => {
        console.error('Error fetching data:', error); // Handle HTTP request errors
        this.dataChange.next([]); // Set empty data on error
      }
    );
  }

  // Map API response to TodoItemNode structure
  mapNodes(nodes: any[]): TodoItemNode[] {
    const nodeMap: { [key: number]: TodoItemNode } = {}; // Map to store nodes by ID
    const rootNodes: TodoItemNode[] = []; // List to store root nodes

    // Create all nodes and map by ID
    nodes.forEach(node => {
      const itemNode = new TodoItemNode();
      itemNode.item = node.attributes?.node || 'Unnamed Node'; // Default value if name is not available
      itemNode.children = [];
      nodeMap[node.id] = itemNode;
    });

    // Establish parent-child relationships
    nodes.forEach(node => {
      const itemNode = nodeMap[node.id];
      const parent = node.attributes?.parent?.data;

      // Add node to its parent's children if it has a parent
      if (parent && nodeMap[parent.id]) {
        nodeMap[parent.id].children.push(itemNode);
      } else {
        // Add to root nodes if it has no parent
        rootNodes.push(itemNode);
      }
    });

    return rootNodes; // Return constructed tree
  }
}

/**
 * @title Tree with checkboxes
 */
@Component({
  selector: 'app-tree', // Component selector
  templateUrl: 'tree.component.html', // Component template URL
  styleUrls: ['tree.component.scss'], // Component styles URL
  providers: [ChecklistDatabase], // Provide the ChecklistDatabase service
  standalone: true, // Standalone component
  imports: [MatCheckboxModule, FormsModule, MatFormFieldModule, MatInputModule, HttpClientModule, MatButtonModule, MatTreeModule, MatIconModule, MatFormFieldModule, MatInputModule, CdkTreeModule, ReactiveFormsModule], // Import necessary modules
})
export class TreeComponent {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  newItemName = '';
  treeControl: FlatTreeControl<TodoItemFlatNode>;
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);
  editingNode: TodoItemFlatNode | null = null; // New property to track editing node

  constructor(private _database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
    });
  }

  getLevel = (node: TodoItemFlatNode) => node.level;
  isExpandable = (node: TodoItemFlatNode) => node.expandable;
  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;
  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;
  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  showInputField(node: TodoItemFlatNode) {
    this.editingNode = this.editingNode === node ? null : node;
  }

  saveNode(node: TodoItemFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    if (nestedNode) {
      this._database.updateItem(nestedNode, itemValue);
      this.editingNode = null;
    }
  }

  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }
}
